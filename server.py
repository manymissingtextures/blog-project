from flask import Flask, request, render_template, jsonify, session, abort, redirect, url_for, Response, make_response
from markupsafe import escape
from datetime import datetime, timedelta
import mariadb
from argon2 import PasswordHasher, exceptions
import json
from threading import Timer

fakeDatabaseArray = [
    {
        "poster": "Patrick",
        "title": "My Day as a C Programmer",
        "date": datetime(2022, 9, 7).date(),
        "editdate": None,
        "views": 437,
        "importance": "None",
        "identifier": 1,
        "contents": "I do need capital. And votes. Wanna know why? 'I have a dream.' That one day, \
                    every person in this nation will control their OWN destiny. A land of the TRULY free, dammit. \
                    A nation of ACTION, not words. Ruled by STRENGTH, not committee. Where the law changes to suit the individual, \
                    not the other way around. Where power and justice are back where they belong: \
                    in the hands of the people! Where every man is free to think -- to act -- for \
                    himself! Fuck all these limp-dick lawyers <script>console.log('fuck you! hacked!');</script> and chicken-shit bureaucrats. \
                    Fuck this 24/7 Internet spew of trivia and celebrity bullshit. Fuck 'American pride'. \
                    Fuck the media! Fuck all of it! America is diseased. Rotten to the core. There's no saving it -- \
                    we need to pull it out by the roots. WIpe the slate clean. BURN IT DOWN! And from the ashes, \
                    a new America will be born. Evolved, but untamed! The weak will be purged, and the strongest will thrive -- \
                    free to live as they see fit, they will make America GREAT AGAIN!"
    },

    
    {
        "poster": "Mr. Gandalfio",
        "title": "Why $70 a month for jesus is too cheap.",
        "date": datetime(2023, 2, 1).date(),
        "editdate": datetime(2026, 8, 25).date(),
        "views": 101,
        "importance": "Featured",
        "identifier": 2,
        "contents": "God is good &#x1F64F;."
    },

    
    {
        "poster": "css",
        "title": "I fucking hate myself",
        "date": datetime(2011, 2, 1).date(),
        "editdate": None,
        "views": 10000,
        "importance": "Admin",
        "identifier": 3,
        "contents": "FUCK CASCADING STYLE SHEETS! (not literally)"
    }
]

importanceToInt = {
    "None": 0,
    "Featured": 1,
    "Admin": 2
}

intToImportance = {
    0: "None",
    1: "Featured",
    2: "Admin"
}

user_connectionParams = {
    "user": 'web-user',
    "password": r']2:Dc.GGf]{}f5_WEb',
    "host": '',
    "database": 'blogposts'
}

interaction_connectionParams = {
    "user": 'web-interaction',
    "password": r'dkA12}]a!4%Hpa]1reqe}',
    "host": 'localhost',
    "database": 'blogposts'
}

admin_connectionParams = {
    "user": 'admin',
    "password": r'iw318%dadMi^n',
    "host": 'localhost',
    "database": 'blogposts'
}

postCreationCooldown = []
sharePostCooldown = []

def removeUserFromCooldown(user):
    # print(f"Removing {user} from cooldown...")
    postCreationCooldown.remove(user)

def removeUserFromShareCooldown(user, post):
    for onCooldown in sharePostCooldown:
        if user in onCooldown and post in onCooldown:
            sharePostCooldown.remove(onCooldown)
            break

def connectToDatabaseTemporarily(ConnectionParameters, Callback):
    databaseConnection = mariadb.connect(**ConnectionParameters)
    databaseCursor = databaseConnection.cursor()

    Callback(databaseConnection, databaseCursor)

    databaseCursor.close()
    databaseConnection.close()

def addFakeBlogPosts(databaseConnection, cursor):
    for dataTable in fakeDatabaseArray:
        cursor.execute("SELECT post_unique_identifier FROM posts WHERE post_unique_identifier=(?)", [dataTable['identifier']])
        if cursor.fetchone() == None:
            cursor.execute("""
                        INSERT LOW_PRIORITY 
                        INTO posts (post_name, upload_date, edit_date, post_importance, account_poster_id, post_content, post_unique_identifier)
                        VALUES (%s, %d, %d, %s, %d, %s, %d)
                        """, [dataTable['title'], dataTable['date'], dataTable['editdate'], importanceToInt[dataTable['importance']], dataTable["poster"], dataTable['contents'], dataTable['identifier']])
            databaseConnection.commit()
            print(f"Committed row into database. [INDEX: {dataTable['identifier']}]")
        

connectToDatabaseTemporarily(admin_connectionParams, addFakeBlogPosts)

clientDatabaseConnection = mariadb.connect(**user_connectionParams)
clientDatabaseCursor = clientDatabaseConnection.cursor()

interactionDatabaseConnection = mariadb.connect(**interaction_connectionParams)
interactionDatabaseCursor = interactionDatabaseConnection.cursor()

adminDatabaseConnection = mariadb.connect(**admin_connectionParams)
adminDatabaseCursor = adminDatabaseConnection.cursor()

app = Flask(__name__, instance_relative_config=False)
# app.config.from_object("config")
# app.config.from_pyfile("config.py")
app.secret_key = "D]]D282d*9a72ad98*FUCKectGoa;Flvk<?>;dawDJZSj*47%hwuvF)(((()d[]]]2dF@^%Dj92*(a9872Ahui21(*##)28d9@*ja892)FdapC,.@."
app.permanent_session_lifetime = timedelta(minutes=30)
# session.permanent = True

@app.route("/")
def index():
    # user = session.get("logged_in", default=None)
    return render_template("index.html")

@app.route("/home", methods=["GET"])
def home():
    sortingAlgorithm = request.args.get("sorting", default="date")
    currentLastIdentifier = int(request.args.get("cid", default=0))
    amountCurrentlyShown = int(request.args.get("rendered", default=0))
    maxPostsToShow = 3

    # """SELECT * 
    # FROM posts 
    # WHERE post_unique_identifier BETWEEN ? AND ?
    # ORDER BY upload_date desc"""

    # SELECT * 
    # FROM posts 
    # GROUP BY post_importance HAVING post_importance=1
    # ORDER BY upload_date desc
    # OFFSET ? ROWS FETCH NEXT ? ROWS ONLY""", 

    # Optimise this, make the blocked users list apart of the session
    # Only update it once a new block or unblock happens

    blockedUsers = ["-"]

    if "logged_in" in session:
        adminDatabaseCursor.execute("SELECT user_settings FROM users WHERE username=?", [session["logged_in"]])
        blockedUsers = json.loads(adminDatabaseCursor.fetchone()[0])["blocked_users"]
        if len(blockedUsers) == 0:
            blockedUsers.append("-")
        else:
            returningList = []
            for blockedUser in blockedUsers:
                returningList.append(blockedUser['username'])
            
            blockedUsers = returningList
    
    blockedUsersString = ', '.join('?' for _ in blockedUsers)

    postLoadingParams = [
            *blockedUsers,
            amountCurrentlyShown, 
            maxPostsToShow
        ]

    if sortingAlgorithm == "Date":
        clientDatabaseCursor.execute(f"""SELECT * 
                                     FROM posts
                                     WHERE account_poster_id NOT IN ({blockedUsersString})
                                     ORDER BY upload_date desc
                                     OFFSET ? ROWS FETCH NEXT ? ROWS ONLY""", 
                                     postLoadingParams)
        
    elif sortingAlgorithm == "Popularity":
        clientDatabaseCursor.execute(f"""SELECT * 
                                     FROM posts
                                     WHERE account_poster_id NOT IN ({blockedUsersString})
                                     ORDER BY post_likes desc, upload_date desc
                                     OFFSET ? ROWS FETCH NEXT ? ROWS ONLY""", 
                                     postLoadingParams)
        
    elif sortingAlgorithm == "Featured":
        clientDatabaseCursor.execute(f"""SELECT * 
                                     FROM posts 
                                     WHERE post_importance=1 AND account_poster_id NOT IN ({blockedUsersString})
                                     ORDER BY upload_date desc
                                     OFFSET ? ROWS FETCH NEXT ? ROWS ONLY""", 
                                     postLoadingParams)
        
    elif sortingAlgorithm == "Announcements":
        clientDatabaseCursor.execute(f"""SELECT * 
                                     FROM posts 
                                     WHERE post_importance=2 AND account_poster_id NOT IN ({blockedUsersString})
                                     ORDER BY upload_date desc
                                     OFFSET ? ROWS FETCH NEXT ? ROWS ONLY""", 
                                     postLoadingParams)

    response = clientDatabaseCursor.fetchall()

    if (response != None):
        postList = []

        for gotPost in response:
            postList.append({
            "post_id": gotPost[0],
            "title": gotPost[1],
            "date": gotPost[2],
            "edit_date": gotPost[3],
            "importance": intToImportance[gotPost[4]],
            "poster": gotPost[5],
            "contents": gotPost[6],
            "identifier": gotPost[7],
            "likes": gotPost[8],
            "shares": gotPost[9]
        })

        return jsonify(postList)
    else:
        return "No more posts!"

passwordHasherReference = PasswordHasher()

adminDatabaseCursor.execute("SELECT post_id, upload_date, edit_date, post_importance, account_poster_id FROM posts")

@app.route("/account", methods=["POST"])
def login():
    requestVariables = request.form

    if requestVariables.get("postType") == "create":
        adminDatabaseCursor.execute("SELECT username FROM users WHERE username=(?)", [requestVariables['username']])
        usernameCheck = adminDatabaseCursor.fetchone()

        adminDatabaseCursor.execute("SELECT email FROM users WHERE email=(?)", [requestVariables['email']])

        emailCheck = adminDatabaseCursor.fetchone()
        if usernameCheck == None and emailCheck == None:
            # Account Creation things here
            passwordhash = passwordHasherReference.hash(requestVariables['password'])
            # print(requestVariables['password'], passwordhash)

            adminDatabaseCursor.execute("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)", [requestVariables['username'], requestVariables['username'], requestVariables['email'], passwordhash, "user", '{"unique_shares": false, "blocked_users": []}'])
            adminDatabaseConnection.commit()
            return {
                "Type": "Creation",
                "Response": "Successful",
                "Code": "200"
                }
        else: 
            return abort(Response(json.dumps({"Message": "Account already exists or email is already in use!"}), 409))
    elif requestVariables.get("postType") == "logout":
        if "logged_in" in session:
            session.pop("logged_in", default=None)
        
        return "Successful" #redirect(url_for("index"), code=307)
        
    elif requestVariables.get("postType") == "login":
        adminDatabaseCursor.execute("SELECT username FROM users WHERE username=(?)", [requestVariables['username']])
        if adminDatabaseCursor.fetchone() == None: 
            return abort(Response(json.dumps({"Message": "Account does not exist!"}), 404))
        else:
            # Login things here
            if "logged_in" in session:
                session.pop("logged_in", default=None)
                
            adminDatabaseCursor.execute("SELECT * FROM users WHERE username=(?)", [requestVariables['username']])
            fetchedLine = adminDatabaseCursor.fetchone()

            if fetchedLine != None:
                credentials = {
                    'username': fetchedLine[0],
                    'display_name': fetchedLine[1],
                    'email': fetchedLine[2],
                    'password_hash': fetchedLine[3],
                    'credentials': fetchedLine[4],
                }

                try: 
                    if passwordHasherReference.verify(credentials["password_hash"], requestVariables["password"]) is True:
                        if passwordHasherReference.check_needs_rehash(credentials["password_hash"]) is True:
                            rehashedPassword = passwordHasherReference.hash(requestVariables["password"])
                            adminDatabaseCursor.execute("UPDATE users SET password_hash=(?) WHERE username=(?)", [rehashedPassword, requestVariables["username"]])
                            adminDatabaseConnection.commit()

                        session["logged_in"] = fetchedLine[0]
                        session["interactions"] = {}
                        return make_response(redirect(url_for("getUsername"))) # userConnected=credentials["username"]
                    else:
                        return abort(Response(json.dumps({"Message": "Credentials do not match"}), 401))

                except exceptions.VerifyMismatchError:
                    return abort(Response(json.dumps({"Message": "Credentials do not match"}), 401))
            else:
                return abort(Response(json.dumps({"Message": "Credentials do not match"}), 401))
    else:
        return abort(Response(json.dumps({"Message": "Unknown login type"}), 405))

@app.post("/publish")
def publishPost():
    if "logged_in" in session:
        adminDatabaseCursor.execute("SELECT username, display_name, email, credentials FROM users WHERE username=?", [session["logged_in"]])
        fetch = adminDatabaseCursor.fetchone()
        if fetch != None and fetch[0] != None and fetch[3] != "banned" and session["logged_in"] not in postCreationCooldown:
            clientDatabaseCursor.execute("SELECT MAX(post_unique_identifier) FROM posts")
            fetch = clientDatabaseCursor.fetchone()

            storedusername = session["logged_in"]
            postCreationCooldown.append(storedusername)
            Timer(15.0, lambda: removeUserFromCooldown(storedusername)).start() #TODO: Change this to minutes later

            if fetch is not None:
                fetch = fetch[0]
            else:
                fetch = 0

            postImportance = importanceToInt[request.form.get('importance', default="None")]

            if postImportance != "None":
                adminDatabaseCursor.execute("SELECT credentials FROM users WHERE username=?", [session["logged_in"]])
                if adminDatabaseCursor.fetchone()[0] != "admin":
                    postImportance = "None"

            postDictonary = {
                "post_name": request.form.get("postTitle"),
                "upload_date": datetime.now().date(),
                "edit_date": None,
                "post_importance": postImportance,
                "account_poster_id": session["logged_in"],
                "post_content": request.form.get("postContent"),
                "post_unique_identifier": fetch + 1,
                "post_likes": 0,
                "post_shares": 0,
            }

            interactionDatabaseCursor.execute("""
                                                INSERT INTO posts VALUES (DEFAULT(post_id), ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                              """, [*postDictonary.values()])
            
            interactionDatabaseConnection.commit()

            return {
                    "Type": "Publish",
                    "Response": "Successful",
                    "Code": "400"
                    }
    return {
            "Type": "Publish",
            "Response": "Unsuccessful",
            "Code": "400"
            }

@app.post("/share")
def sharepost():
    postInteracting = request.form.get("postInteracting")

    if "logged_in" in session:
        for onCooldown in sharePostCooldown:
            if session["logged_in"] in onCooldown and postInteracting in onCooldown:
                return Response(json.dumps("Unsuccessful"), 200)
        
        interactionDatabaseCursor.execute("SELECT * FROM post_interactions WHERE username=? AND post_unique_identifier=?", [session["logged_in"], postInteracting])
        fetchData = interactionDatabaseCursor.fetchone()
        storedUsername = session["logged_in"]

        sharePostCooldown.append([storedUsername, postInteracting])
        Timer(120.0, lambda: removeUserFromShareCooldown(storedUsername, postInteracting)).start()

        if fetchData is None:
            interactionDatabaseCursor.execute("INSERT INTO post_interactions VALUES (?, ?, ?, 1)", [postInteracting, session["logged_in"], None])
        else:
            interactionDatabaseCursor.execute("UPDATE post_interactions SET shares=shares+1 WHERE username=? AND post_unique_identifier=?", [session["logged_in"], postInteracting])

        interactionDatabaseCursor.execute("""
            UPDATE posts SET post_shares=(SELECT SUM(shares) FROM post_interactions WHERE post_unique_identifier=?) WHERE post_unique_identifier=?
            """, [postInteracting, postInteracting])
        
        interactionDatabaseConnection.commit()

        return Response(json.dumps("Successful"), 200)
    
    return Response(json.dumps("Unsuccessful"), 200)
    
@app.post("/interact")
def interaction():
    postInteracting = request.form.get("postInteracting")
    userInteraction = request.form.get("userInteraction")

    if "logged_in" in session:
        interactionDatabaseCursor.execute("SELECT * FROM post_interactions WHERE username=? AND post_unique_identifier=?", [session["logged_in"], postInteracting])
        fetchData = interactionDatabaseCursor.fetchone()
        reaction = userInteraction
        
        if reaction == "share":
            reaction = None

        if fetchData is None:
            interactionDatabaseCursor.execute("INSERT INTO post_interactions VALUES (?, ?, ?, 0)", [postInteracting, session["logged_in"], reaction])
        else:
            if userInteraction != fetchData[2]:
                interactionDatabaseCursor.execute("""
                                                    UPDATE post_interactions SET interaction_type=? WHERE post_unique_identifier=? AND username=?
                                                    """, [reaction, postInteracting, session["logged_in"]])
            else:
                interactionDatabaseCursor.execute("DELETE FROM post_interactions WHERE post_unique_identifier=? AND username=?", [postInteracting, session["logged_in"]])
            
        interactionDatabaseCursor.execute("""
                                        UPDATE posts SET post_likes=((SELECT COUNT(interaction_type) FROM post_interactions WHERE interaction_type='like' AND post_unique_identifier=?) - (SELECT COUNT(interaction_type) FROM post_interactions WHERE interaction_type='dislike' AND post_unique_identifier=?)) WHERE post_unique_identifier=?
                                        """, [postInteracting, postInteracting, postInteracting])
        
        interactionDatabaseConnection.commit()

        if fetchData is not None and fetchData[2] == userInteraction:
            return abort(Response(json.dumps("Reset"), 200))

        return abort(Response(json.dumps("Successful"), 200))

    else:
        return abort(Response(json.dumps("Unsuccessful"), 200))
    
@app.get("/getinteractions")
def getInteractions():
    identifier = request.args.get("post")
    returnType = request.args.get("return", default="Total")
    data = None

    if returnType == "Total":
        clientDatabaseCursor.execute("SELECT post_likes FROM posts WHERE post_unique_identifier=?", [identifier])
        data = clientDatabaseCursor.fetchone()[0]
    elif returnType == "Individual":
        if session["logged_in"]:
            clientDatabaseCursor.execute("SELECT interaction_type FROM post_interactions WHERE post_unique_identifier=? AND username=?", [identifier, session["logged_in"]])
            fetched = clientDatabaseCursor.fetchone()

            if fetched is not None and fetched[0] is not None:
                if fetched[0] == "like":
                    data = 1
                else:
                    data = -1

    return {"interactions": data}

@app.get("/username")
def getUsername():
    sessionUsername = session.get("logged_in", default=None)
    adminDatabaseCursor.execute("SELECT credentials FROM users WHERE username=?", [sessionUsername])
    sessionCredentials = adminDatabaseCursor.fetchone()
    rawObject = {"username": sessionUsername, 
                 "credentials": sessionCredentials}
    return json.dumps(rawObject)

@app.get("/somethingwentwrong")
def error():
    return render_template("error.html", code=request.args.get("code", default="NaN"), description=request.args.get("description", default="No description."))

@app.get("/posts/<post_unique_id>")
def getPost(post_unique_id):
    getParam = request.args.get("reason", default=None)

    if getParam == "getpost" or getParam == "editpost":
        clientDatabaseCursor.execute("SELECT * FROM posts WHERE post_unique_identifier=(?)", [post_unique_id])
        response = clientDatabaseCursor.fetchall()
        if response != None and len(response) > 0:
            postList = []

            for gotPost in response:
                postList.append({
                "post_id": gotPost[0],
                "title": gotPost[1],
                "date": gotPost[2],
                "edit_date": gotPost[3],
                "importance": intToImportance[gotPost[4]],
                "poster": gotPost[5],
                "contents": gotPost[6],
                "identifier": gotPost[7],
                "likes": gotPost[8],
                "shares": gotPost[9]
            })
            
            return postList
        else:
            # return redirect(url_for("error", code=204, description="Invalid post id! This post does not exist or the database is down."))
            return redirect(url_for("index"))
    else:
        return render_template("postTemplate.html")

@app.get("/dashboard")
def dashboard():
    if "logged_in" in session:
        return render_template("dashboard.html")
    else:
        abort(Response(json.dumps({"Message": "Not logged in!"}), 412))

@app.route("/usersettings", methods=["GET", "POST"])
def usersettings():
    if "logged_in" in session:
        if request.method == "GET":
            adminDatabaseCursor.execute("SELECT user_settings FROM users WHERE username=?", [session["logged_in"]])
            res = adminDatabaseCursor.fetchone()[0]
            return res
        elif request.method == "POST":
            jsonSettings = request.form.get("userSettings")
            parsedSettings = json.loads(jsonSettings)
            parsedSettings.pop("blocked_users")

            adminDatabaseCursor.execute("SELECT user_settings FROM users WHERE username=?", [session["logged_in"]])
            res = json.loads(adminDatabaseCursor.fetchone()[0])["blocked_users"]

            parsedSettings["blocked_users"] = res

            adminDatabaseCursor.execute("SELECT JSON_VALID(?)", [json.dumps(parsedSettings)])
            fetch = adminDatabaseCursor.fetchone()
            if fetch[0] == 1:
                adminDatabaseCursor.execute("UPDATE users SET user_settings=? WHERE username=?", [jsonSettings, session["logged_in"]])
                adminDatabaseConnection.commit()
                return Response(json.dumps("Successful"))
            else:
                return Response(json.dumps("Unsuccessful"))

@app.delete("/deletepost")
def deletepost():
    if session["logged_in"]:
        postToDelete = request.args.get("post")
        print([postToDelete, session["logged_in"]])
        adminDatabaseCursor.execute("DELETE FROM posts WHERE post_unique_identifier=? AND account_poster_id=?", [postToDelete, session["logged_in"]])
        adminDatabaseConnection.commit()
        return Response(json.dumps("Successful"))
    
    return Response(json.dumps("Unsuccessful"))

@app.put("/editpost")
def editpost():
    postToEdit = request.form.get("postid")
    edit_title = request.form.get("postTitle")
    edit_content = request.form.get("postContent")
    edit_date = datetime.now().date()

    adminDatabaseCursor.execute("SELECT account_poster_id FROM posts WHERE post_unique_identifier=?", [postToEdit])
    if adminDatabaseCursor.fetchone()[0] == session["logged_in"]:
        adminDatabaseCursor.execute("""
            UPDATE posts SET 
            post_name=?, 
            post_content=?, 
            edit_date=? 
            
            WHERE 
            post_unique_identifier=? 
            AND 
            account_poster_id=?""", [
                edit_title, edit_content, edit_date,
                postToEdit, session["logged_in"]
            ])
        
        adminDatabaseConnection.commit()
        return Response(json.dumps("Successful"))
    
    return Response(json.dumps("Unsuccessful"))

def findValueInList(list, value) -> list:
    for index in list:
        if value == index:
            return list

@app.put("/blockuser")
def blockinghandler():
    if "logged_in" in session:
        user = session["logged_in"]
        userBlocking = request.form.get("blocking")
        blockingFromPost = request.form.get("post")
        requestType = request.form.get("requestType")

        if user == userBlocking:
            return Response(json.dumps("Unsuccessful"))

        adminDatabaseCursor.execute("SELECT user_settings FROM users WHERE username=?", [user])
        jsonSettings = json.loads(adminDatabaseCursor.fetchone()[0])
        blockedList = jsonSettings["blocked_users"]
        blockedUserList = None

        for blockData in blockedList:
            if blockData["username"] == userBlocking:
                blockedUserList = blockData
                break

        clientDatabaseCursor.execute("SELECT post_name FROM posts WHERE post_unique_identifier=?", [blockingFromPost])
        fetchedContent = clientDatabaseCursor.fetchone()[0]
        parsedText = []

        splitContent = fetchedContent.split()
        for i in range(0, 15):
            if len(splitContent) - 1 >= i:
                parsedText.append(splitContent[i])
            else:
                break

        if len(splitContent) > 15:
            parsedText.append("...")

        if requestType == "Block":
            if not blockedUserList:
                jsonSettings["blocked_users"].append({
                    "username": userBlocking,
                    "post": blockingFromPost,
                    "note": " ".join(parsedText),
                    "date": str(datetime.now().date()),
                })
                print("Blocking")
        elif requestType == "Unblock":
            print("Trying to unblock")
            if blockedUserList:
                blockedList.remove(blockedUserList)
                print("Unblocking")

        adminDatabaseCursor.execute("UPDATE users SET user_settings=? WHERE username=?", [json.dumps(jsonSettings), user])
        adminDatabaseConnection.commit()

        return Response(json.dumps("Successful"))

@app.get("/getuserposts/<user>")
def getUserPosts(user):
    clientDatabaseCursor.execute("SELECT * FROM posts WHERE account_poster_id=? ORDER BY upload_date desc", [user])
    response = clientDatabaseCursor.fetchall()

    if (response != None):
        postList = []

        for gotPost in response:
            postList.append({
            "post_id": gotPost[0],
            "title": gotPost[1],
            "date": gotPost[2],
            "edit_date": gotPost[3],
            "importance": intToImportance[gotPost[4]],
            "poster": gotPost[5],
            "contents": gotPost[6],
            "identifier": gotPost[7],
            "likes": gotPost[8],
            "shares": gotPost[9]
        })

        return jsonify(postList)
    else:
        return Response(json.dumps("No posts"))
    
@app.delete("/deleteaccount")
def deleteUserAccount():
    if "logged_in" in session:
        username = session["logged_in"]
        session.pop("logged_in")
        try:
            guess = request.form.get("password")
            retype_guess = request.form.get("retype_password")
            email = request.form.get("email")

            if guess == retype_guess:
                adminDatabaseCursor.execute("SELECT password_hash FROM users WHERE username=? AND email=?", [username, email])
                pwdHash = adminDatabaseCursor.fetchone()

                if pwdHash is None:
                    print("Incorrect Username or Email")
                    return Response(json.dumps("Unsuccessful"))
                else:
                    pwdHash = pwdHash[0]


                if passwordHasherReference.verify(pwdHash, guess):
                    adminDatabaseCursor.execute("DELETE FROM posts WHERE account_poster_id=?", [username])
                    adminDatabaseCursor.execute("DELETE FROM users WHERE username=? AND password_hash=?", [username, pwdHash])
                    # adminDatabaseConnection.commit()
                    print("Account successfully deleted")
                    return Response(json.dumps("Successful"))
                
        except ValueError:
            print("Password unable to be verified.")
            return Response(json.dumps("Unsuccessful"))
        
    print("Not logged in.")
    return Response(json.dumps("Unsuccessful"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port="8000", debug=True)
        