let MotdEnabled = false;
const clickOffElements = [];

let loggedIn = false;
let currentAccount = undefined;
let confirmationCurrentlyPrompted = false;

let relativeMousePos = { X: 0, Y: 0 };
let absoluteMousePos = { X: 0, Y: 0 };

document.onmousemove = function (event) {
  relativeMousePos.X = event.clientX;
  relativeMousePos.Y = event.clientY;

  absoluteMousePos.X = event.pageX;
  absoluteMousePos.Y = event.pageY;
};

const glowElement = (element, enable) => {
  if (enable) {
    element.style.filter = "drop-shadow(0px 2px 6px rgba(0, 0, 0, 0.75))";
  } else {
    element.style.filter = "drop-shadow(0px 2px 6px rgba(0, 0, 0, 0))";
  }
};

const switchDescendantLineHeight = (element, value) => {
  for (pTag of element.children) {
    pTag.style.lineHeight = value;
  }
};

const unblurElement = (element) => {
  const motdElement = document.getElementById("motdContainer");

  element.style.filter = "blur(0px)";
  element.style.animationDuration = "2s";
  element.style.animationName = "blurOff";

  motdElement.style.display = "none";
};

const changeVisibility = (element, forwards = false) => {
  if (element.style.opacity < 1) {
    element.style.animationDuration = ".25s";
    element.style.animationDirection = "reverse";
    element.style.animationName = "invisible";

    element.style.opacity = 1;
    element.style.visibility = "visible";

    if (!forwards) {
      setTimeout(() => {
        element.style.animationName = undefined;
      }, 250);
    }
  } else {
    element.style.animationDuration = ".25s";
    element.style.animationDirection = "normal";
    element.style.animationName = "invisible";

    element.style.opacity = 0;

    if (!forwards) {
      setTimeout(() => {
        element.style.visibility = "hidden";
        element.style.animationName = undefined;
      }, 250);
    }
  }
};

const changeVisibilityOnClick = (element, selectors) => {
  clickOffElements.push({
    element: element,
    selector: selectors,
  });
};

const notificationFunction = (text, duration) => {
  duration = duration || 3000;
  let notificationDiv = document.createElement("div");
  let notificationText = document.createElement("h4");

  notificationDiv.className = "notificationBottom center";
  notificationDiv.style.opacity = 0;
  notificationText.innerText = text;

  notificationDiv.append(notificationText);
  document.getElementById("notificationsDiv").append(notificationDiv);

  changeVisibility(notificationDiv);

  setTimeout(() => {
    changeVisibility(notificationDiv);
    setTimeout(() => {
      notificationDiv.remove();
    }, 350);
  }, duration || 3000);
};

const sanitizeHTML = (data) => {
  const infectedText = /<script>/gi;
  let replaced = data.replaceAll(infectedText, "~ ! ~");

  return replaced;
};

const getInteractions = (postid) => {
  let params = new URLSearchParams();
  params.append("post", postid);
  total = 0;
  fetch(`/getinteractions?${params.toString()}`)
    .then((response) => response.json())
    .then((jsonResponse) => {
      total = jsonResponse["interactions"];
    });

  return total;
};

const main = () => {
  const blogMainElement = document.getElementById("blogMain");

  const largeFirstLetter = (element) => {
    let splitStr = element.innerText.split(" ");

    if (splitStr.length > 0) {
      splitStr = splitStr[0];
    } else {
      return;
    }

    let spanElement = "<span style='font-size: 200%;'>" + splitStr + "</span>";
    let searchForSpace = element.innerText.search(" ");
    element.innerHTML =
      spanElement +
      element.innerText.substring(
        searchForSpace > -1 ? searchForSpace : Infinity
      );
  };

  const getConfirmation = (ask) => {
    return new Promise((resolve, reject) => {
      const confirmationNotification = document.getElementById(
        "confirmationWindowFinalContainer"
      );
      const yesConfirmation = document.getElementById("yesConfirmation");
      const noConfirmation = document.getElementById("noConfirmation");

      document.querySelector("#confirmationWindowFinalContainer p").innerText =
        ask;
      confirmationCurrentlyPrompted = true;
      confirmationNotification.style.display = "block";

      const finishedConfirmation = (answer) => {
        yesConfirmation.removeEventListener("click", confirmedYes);
        noConfirmation.removeEventListener("click", confirmedNo);
        confirmationCurrentlyPrompted = false;

        confirmationNotification.style.display = "none";

        return resolve(answer);
      };

      const confirmedYes = () => finishedConfirmation(true);
      const confirmedNo = () => finishedConfirmation(false);

      yesConfirmation.addEventListener("click", confirmedYes);
      noConfirmation.addEventListener("click", confirmedNo);
    });
  };

  const postOptionsContainer = document.getElementById("postOptionsContainer");
  const postOption_Block = document.getElementById("option_blockUser");
  const postOption_Edit = document.getElementById("option_editPost");
  const postOption_Delete = document.getElementById("option_deletePost");
  let postOptionsAttachment = undefined;
  let postAttachment = undefined;

  postOption_Block.onclick = function () {
    const formData = new FormData();
    const connectedPost = findItemInPosts(globalRenderedPosts, postAttachment);
    formData.append("blocking", connectedPost[1]["poster"]);
    formData.append("post", connectedPost[1]["post_unique_identifier"]);
    formData.append("requestType", "Block");
    fetch("/blockuser", {
      method: "PUT",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        notificationFunction(data);
      });
  };

  postOption_Edit.onclick = function () {
    const item = findItemInPosts(globalRenderedPosts, postAttachment);
    const searchParams = new URLSearchParams();
    searchParams.append("reason", "edit");
    window.location.href = `/posts/${item[1]["post_unique_identifier"]}?${searchParams}`;
  };

  postOption_Delete.onclick = function async() {
    const response = new Promise((resolve, reject) => {
      return resolve(
        getConfirmation(
          "Are you sure you want to permanently delete this post?"
        )
      );
    });
    response.then((answer) => {
      if (answer == true) {
        const item = findItemInPosts(globalRenderedPosts, postAttachment);
        if (item) {
          postAttachment.style.display = "None";
          fetch(`/deletepost?post=${item[1]["post_unique_identifier"]}`, {
            method: "DELETE",
          });
          window.location.href = "/?res=successfuldelete";
        } else {
          notificationFunction("An error has occured!");
        }
      }
    });
  };

  const postOptionsVisibility = function (attachment) {
    if (attachment != undefined) {
      changeVisibility(postOptionsContainer, false, false, true);
      postOptionsContainer.style.left = absoluteMousePos.X + "px";
      postOptionsContainer.style.top = absoluteMousePos.Y + "px";
      const renderedPost = findItemInPosts(globalRenderedPosts, attachment);
      if (renderedPost) {
        // console.log(renderedPost[1].poster, currentAccount);
        if (renderedPost[1].poster == currentAccount) {
          postOption_Edit.style.display = "inline";
          postOption_Delete.style.display = "inline";
        } else {
          postOption_Edit.style.display = "none";
          postOption_Delete.style.display = "none";
        }
      } else {
        postOption_Edit.style.display = "none";
        postOption_Delete.style.display = "none";
      }
    } else if (attachment == undefined) {
      changeVisibility(postOptionsContainer, false, false, false);
    }
    postOptionsAttachment = attachment;
    if (attachment != undefined) {
      postAttachment = attachment;
    }
  };

  const blogCreationContainer = document.getElementById(
    "blogCreationContainer"
  );
  const postCreationForm = document.getElementById("createblogElementForm");
  const loadingImage = document.getElementById("loadingImageContainer");
  let lastRenderedPost = 0; // Should put the load posts here NOT in a for loop, will prevent an edge case where the edit ID COULD be different **Comment potentially redundant
  let postid = 0;

  let globalRenderedPosts = [];
  const findItemInPosts = function (array, item) {
    for (let i = 0; i < array.length; i++) {
      if (array[i][0] === item) {
        return array[i];
      }
    }
  };

  postCreationForm.addEventListener("submit", async (event) => {
    const formData = new FormData(event.target);
    formData.append("postid", postid);
    console.log(postid);
    await fetch("/editpost", {
      method: "PUT",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data == "Successful") {
          const searchParams = new URLSearchParams();
          searchParams.append("res", "successfuledit");
          window.location.href = `/?${searchParams}`;
        } else {
          notificationFunction("An error has occured while editing this post!");
        }
      });
  });

  document.querySelector("#blogpostSubmit > input[value='Discard']").onclick =
    () => {
      new Promise((resolve, reject) => {
        return resolve(
          getConfirmation("Are you sure you want to discard these edits?")
        );
      }).then(() => {
        window.location.href = `/`;
      });
    };

  const loadPosts = async (reload = true) => {
    loadingImage.style.opacity = 1;
    const renderedPosts = [];

    if (reload) {
      lastRenderedPost = 0;
      while (blogMainElement.firstElementChild) {
        blogMainElement.firstElementChild.remove();
      }
    }

    endpointParams = window.location.href.split("/posts/");
    postid = endpointParams[1].split("?")[0];

    const reasonArg = window.location.href.split("?reason=");
    if (reasonArg[1] == "edit") {
      loadingImage.style.display = "none";
      let fetchedData = new Promise(async (resolve) => {
        return resolve(await fetch(`/posts/${postid}?reason=editpost`));
      });

      fetchedData.catch(() => {
        const searchparams = new URLSearchParams();
        searchparams.append("code", 406);
        searchparams.append(
          "description",
          "The post you're trying to edit either doesn't exist, was deleted, or you do not have permission to edit it!"
        );
        window.location.href = `/somethingwentwrong?${searchparams}`;
      });

      fetchedData
        .then((database) => database.json())
        .then((data) => {
          document.getElementById("postCreateTitle").value = data[0].title;
          document.getElementById("postCreateContent").value = data[0].contents;
          document.querySelector(".PostVIEWS").innerHTML =
            `<img src='/static/images/like.png' src='{{ url_for('static", filename='/images/like.png') }}' alt='Likes'/>&nbsp; ` +
            data[0].likes;
          blogCreationContainer.style.display = "block";
        });
    } else {
      await fetch(`/posts/${postid}?reason=getpost`)
        .then((database) => database.json())
        .catch(() => {
          const searchparams = new URLSearchParams();
          searchparams.append("code", 404);
          searchparams.append(
            "description",
            "The post you're trying to view either doesn't exist or was deleted!"
          );
          window.location.href = `/somethingwentwrong?${searchparams}`;
        })
        .then((databaseList) => {
          for (let i = 0; i < databaseList.length; i++) {
            // Containers //
            let HTML_blogElementContainer = document.createElement("div");
            HTML_blogElementContainer.className = "blogElementContainer";

            let HTML_blogElement = document.createElement("div");
            HTML_blogElement.className = "blogElement center";

            // Heading //
            let HTML_blogElementHeading = document.createElement("div");
            HTML_blogElementHeading.className = "blogElementHeading";

            // Subheading //
            let HTML_blogElementHeadingSubtitle = document.createElement("div");
            HTML_blogElementHeadingSubtitle.className =
              "blogElementHeadingSubtitle";

            // Body //
            let HTML_blogElementBody = document.createElement("div");
            HTML_blogElementBody.className = "blogElementBody";

            let HTML_blogElementP = document.createElement("p");

            // Reactions //
            let HTML_blogElementReactions = document.createElement("div");
            HTML_blogElementReactions.className = "blogMainReactions";

            // Appending {Ordered} //
            HTML_blogElementContainer.appendChild(HTML_blogElement);

            HTML_blogElement.appendChild(HTML_blogElementHeading);
            HTML_blogElement.appendChild(HTML_blogElementHeadingSubtitle);

            HTML_blogElement.appendChild(HTML_blogElementBody);
            HTML_blogElementBody.appendChild(HTML_blogElementP);
            HTML_blogElement.appendChild(HTML_blogElementReactions);

            const properties = {
              post_unique_identifier: databaseList[i]["identifier"],
              poster: databaseList[i]["poster"],
            };

            const dictElements = {
              heading: [
                {
                  tag: "span",
                  className: "blogElementTitle",
                  mainClass: "PostTITLE",
                  content: undefined,
                },

                {
                  tag: "span",
                  className: "blogElementSubtitle",
                  mainClass: "blogElementImportance",
                  content: undefined,
                },

                {
                  tag: "span",
                  className: "blogElementSubtitle",
                  mainClass: "PostDATE",
                  content: undefined,
                },

                {
                  tag: "span",
                  className: "blogElementSubtitle",
                  mainClass: "PostSubEDIT",
                  content: undefined,
                },

                {
                  tag: "a",
                  className: "",
                  mainClass: "postOptions",
                  content: "&#x22EE;",
                },
              ],

              subheading: [
                {
                  tag: "span",
                  className: "blogElementSubtitle",
                  mainClass: "PostUSER",
                  content: undefined,
                },

                {
                  tag: "span",
                  className: "blogElementSubtitle",
                  mainClass: "",
                  content: "&nbsp; &#x2022; &nbsp;",
                },

                {
                  tag: "span",
                  className: "blogElementSubtitle",
                  mainClass: "PostLIKES",
                  content: undefined,
                },

                {
                  tag: "span",
                  className: "blogElementSubtitle",
                  mainClass: "",
                  content: "&nbsp; &#x2022; &nbsp;",
                },

                {
                  tag: "span",
                  className: "blogElementSubtitle",
                  mainClass: "PostSHARES",
                  content: undefined,
                },
              ],

              reactions: [
                {
                  tag: "a",
                  className: "blogReactionButton reaction",
                  mainClass: "likePost",
                  content:
                    "<img src='/static/images/like.png' src='{{ url_for('static', filename='/images/like.png') }}' alt='Like' />",
                },

                {
                  tag: "span",
                  className: "blogReactionButton",
                  mainClass: "",
                  content: "&nbsp; &#x00B7; &nbsp;",
                },

                {
                  tag: "a",
                  className: "blogReactionButton reaction",
                  mainClass: "dislikePost",
                  content:
                    "<img src='/static/images/dislike.png' src='{{ url_for('static', filename='/images/dislike.png') }}' alt='Dislike' />",
                },

                {
                  tag: "span",
                  className: "blogReactionButton",
                  mainClass: "",
                  content: "&nbsp; &#x00B7; &nbsp;",
                },

                {
                  tag: "a",
                  className: "blogReactionButton reaction",
                  mainClass: "sharePost",
                  content:
                    "<img src='/static/images/send.png' src='{{ url_for('static', filename='/images/send.png') }}' alt='Share' />",
                },
              ],
            };

            globalRenderedPosts.push([HTML_blogElementContainer, properties]);

            let postDate = new Date(databaseList[i]["date"]);
            let editDate = new Date(databaseList[i]["edit_date"]);

            if (databaseList[i]["edit_date"] == undefined) {
              editDate = undefined;
            }

            const createdElements = [];
            let shareDebounce = false;

            const getCreatedElement = function (mainClass) {
              for (let v in createdElements) {
                if (createdElements[v].mainClass == mainClass) {
                  return createdElements[v].element;
                }
              }
            };

            for (let currentContainer in dictElements) {
              for (let storedElement of dictElements[currentContainer]) {
                let newElement = document.createElement(storedElement.tag);
                let mainClass = "";
                if (storedElement.mainClass) {
                  mainClass = " " + storedElement.mainClass;
                }
                newElement.className = storedElement.className + mainClass;

                if (currentContainer == "heading") {
                  HTML_blogElementHeading.append(newElement);
                } else if (currentContainer == "subheading") {
                  HTML_blogElementHeadingSubtitle.append(newElement);
                } else if (currentContainer == "reactions") {
                  HTML_blogElementReactions.append(newElement);
                } else {
                  console.log(
                    newElement.className + "; has nowhere to be appended!"
                  );
                }

                switch (storedElement.mainClass) {
                  case "postOptions":
                    newElement.onclick = function () {
                      postOptionsVisibility(HTML_blogElementContainer);
                    };
                    newElement.innerHTML = storedElement.content;
                    break;

                  case "PostTITLE":
                    newElement.innerHTML = sanitizeHTML(
                      databaseList[i]["title"]
                    );
                    break;

                  case "PostUSER":
                    newElement.innerHTML =
                      "&#x270E; &nbsp;" +
                      sanitizeHTML(databaseList[i]["poster"]);
                    break;

                  case "blogElementImportance":
                    const PostImportance = databaseList[i]["importance"];
                    switch (PostImportance) {
                      case "Featured":
                        newElement.innerHTML = "&#x2606; &nbsp;";
                        newElement.style.color = "rgb(224, 212, 45)";
                        break;

                      case "Admin":
                        newElement.innerHTML = "&#x1F6E1; &nbsp;";
                        newElement.style.color = "rgb(45, 224, 69)";
                        break;

                      default:
                        break;
                    }
                    break;

                  case "PostDATE":
                    postDate.setDate(postDate.getDate() + 1);

                    if (editDate != undefined) {
                      editDate.setDate(editDate.getDate() + 1);
                      newElement.innerHTML = `${postDate.toDateString()}<br /><span class="PostEDIT">${editDate.toDateString()}</span>`;
                      newElement.title =
                        [
                          postDate.getFullYear(),
                          postDate.getMonth() + 1,
                          postDate.getDate(),
                        ].join("/") +
                        " > " +
                        [
                          editDate.getFullYear(),
                          editDate.getMonth() + 1,
                          editDate.getDate(),
                        ].join("/");
                    } else {
                      newElement.innerHTML = postDate.toDateString();
                      newElement.title = [
                        postDate.getFullYear(),
                        postDate.getMonth() + 1,
                        postDate.getDate(),
                      ].join("/");
                    }
                    break;

                  case "PostLIKES":
                    newElement.innerHTML =
                      "<img src='/static/images/like.png' src='{{ url_for('static', filename='/images/like.png') }}' alt='Likes' /> &nbsp;" +
                      databaseList[i]["likes"].toLocaleString();
                    break;

                  case "PostSHARES":
                    newElement.innerHTML =
                      "<img src='/static/images/send.png' src='{{ url_for('static', filename='/images/send.png') }}' alt='Share' /> &nbsp;" +
                      databaseList[i]["shares"].toLocaleString();
                    break;

                  case "PostSubEDIT":
                    if (databaseList[i].edit_date != undefined) {
                      newElement.innerHTML = "&nbsp; &#x2022; &nbsp;Edited";
                    }
                    break;

                  case "sharePost":
                  case "dislikePost":
                  case "likePost":
                    newElement.innerHTML = storedElement.content;
                    if (
                      storedElement.mainClass == "likePost" ||
                      storedElement.mainClass == "dislikePost"
                    ) {
                      newElement.onclick = function () {
                        const likesShownElement =
                          getCreatedElement("PostLIKES");
                        const likeElement = getCreatedElement("likePost");
                        const dislikeElement = getCreatedElement("dislikePost");

                        if (loggedIn) {
                          if (interactDebounce === false) {
                            let interactionData = new FormData();
                            interactionData.append(
                              "postInteracting",
                              databaseList[i].identifier
                            );
                            interactionData.append(
                              "userInteraction",
                              storedElement.mainClass.slice(0, -4)
                            );
                            fetch("/interact", {
                              method: "POST",
                              body: interactionData,
                            })
                              .then((response) => response.json())
                              .then((jsonResponse) => {
                                if (jsonResponse == "Successful") {
                                  newElement.style.opacity = 1;

                                  if (storedElement.mainClass == "likePost") {
                                    // LIKING
                                    likeElement.style.opacity = 0.5;
                                    dislikeElement.style.opacity = 1;
                                  } else {
                                    // DISLIKING
                                    dislikeElement.style.opacity = 0.5;
                                    likeElement.style.opacity = 1;
                                  }
                                } else if (jsonResponse == "Reset") {
                                  // RESETTING
                                  likeElement.style.opacity = 1;
                                  dislikeElement.style.opacity = 1;
                                } else {
                                  notificationFunction(
                                    "An error has occured while voting!"
                                  );
                                }

                                updateInteractionText(
                                  databaseList[i].identifier,
                                  likesShownElement
                                );
                              });

                            interactDebounce = true;
                            setTimeout(() => {
                              interactDebounce = false;
                            }, 500);
                          }
                        } else {
                          notificationFunction(
                            "You cannot vote on a post without being logged in!"
                          );
                        }
                      };
                    } else if (storedElement.mainClass == "sharePost") {
                      newElement.onclick = function () {
                        notificationFunction("Link copied to clipboard!");
                        navigator.clipboard.writeText(
                          `${window.location.origin}/posts/${databaseList[i].identifier}`
                        );

                        if (shareDebounce == false) {
                          shareDebounce = true;
                          setTimeout(() => {
                            shareDebounce = false;
                          }, 120 * 1000);
                          const formData = new FormData();
                          formData.append(
                            "postInteracting",
                            properties.post_unique_identifier
                          );
                          fetch("/share", { method: "POST", body: formData });
                          const shareText = getCreatedElement("PostSHARES");
                          const splitText = shareText.innerHTML.split("&nbsp;");
                          shareText.innerHTML =
                            splitText[0] +
                            "&nbsp;" +
                            (
                              Number(splitText[1].replaceAll(",", "")) + 1
                            ).toLocaleString();
                        }
                      };
                    }
                    break;

                  default:
                    newElement.innerHTML =
                      sanitizeHTML(storedElement.content) || "";
                    break;
                }
              }
            }

            renderedPosts.push({
              container: HTML_blogElementContainer,
              date: postDate,
              importance: databaseList[i]["importance"],
              unique: databaseList[i]["identifier"],
            });

            for (let i = 0; i < renderedPosts.length; i++) {
              blogMainElement.appendChild(renderedPosts[i].container);
            }

            HTML_blogElementP.innerHTML = databaseList[i]["contents"];

            largeFirstLetter(HTML_blogElementP);
            renderedPosts.sort((a, b) => {
              switch (currentSortingMode) {
                case "Announcements":
                  if (a.importance == "Admin") {
                    if (b.importance == a.importance) {
                      return a.date - b.date;
                    }
                    return 1;
                  }
                  return a.date - b.date;

                case "Featured":
                  if (a.importance == "Featured") {
                    if (b.importance == a.importance) {
                      return a.date - b.date;
                    }
                    return 1;
                  }
                  return a.date - b.date;

                case "Popularity":
                  return a.likes - b.likes;

                case "Date":
                default:
                  return a.date - b.date;
              }
            });
          }
        });

      loadingImage.style.opacity = 0;

      if (renderedPosts.at(-1)) {
        lastRenderedPost = renderedPosts.at(-1).unique;
      }
    }
  };

  const messageOfTheDayAppear = () => {
    const motdElement = document.getElementById("motdContainer");
    const motdElementContainer = document.getElementById("motdFinalContainer");
    motdElementContainer.style.display = "block";
    motdElement.style.opacity = "100%";
    blogMainElement.style.filter = "blur(5px)";

    motdElement.style.animationDuration = "1s";
    motdElement.style.animationDirection = "reverse";
    motdElement.style.animationName = "invisible";
  };

  // Main Logic on Page Load //
  if (MotdEnabled) {
    messageOfTheDayAppear();
  }

  window.onclick = function (event) {
    const modal = event.target;
    for (let i in clickOffElements) {
      if (
        clickOffElements[i].element != modal &&
        clickOffElements[i].selector.indexOf(modal) < 0 &&
        clickOffElements[i].element.style.opacity > 0
      ) {
        changeVisibility(clickOffElements[i].element);
      }
    }
  };

  setTimeout(() => {
    loadPosts((reload = true));
  }, 500);

  const accountForm = document.querySelector("#accountTabContainer > form");
  const emailElement = document.querySelector("#accountTabContainer .forEmail");
  const createAccountLink = document.querySelector("#createAccount a");
  const accountTab = document.getElementById("accountTab");
  const accountCreationForm = document.getElementById("accountCreationForm");
  const emailInputElement = document.getElementById("email");
  const accountErrorText = document.querySelector(".submitBody ~ tbody p");
  const accountButton = document.getElementById("accountButton");

  const accountErrorFunction = function (text) {
    accountErrorText.innerText = text;
    accountErrorText.style.opacity = 1;

    setTimeout(() => {
      if (accountErrorText.innerText == text) {
        accountErrorText.style.opacity = 0;
      }
    }, 2000);
  };

  const accountButtonBehaviour = function (get = true, toLogout = true) {
    if (get === true) {
      if (loggedIn === false) {
        return "Login";
      } else {
        return "Logout";
      }
    } else {
      if (toLogout === true) {
        document.documentElement.style.setProperty(
          "--accountButtonHoverBG",
          "rgb(200, 0, 50)"
        );
        accountCreationForm.style.display = "none";
      } else {
        document.documentElement.style.setProperty(
          "--accountButtonHoverBG",
          "rgba(31, 68, 37, 0.75)"
        );
        accountCreationForm.style.display = "block";
        accountButton.innerText = "Account";
      }
    }
  };

  const getCurrentUsername = async function (
    set = false,
    setBehaviour = false
  ) {
    await fetch("/username")
      .then((raw) => raw.json())
      .then((user) => {
        if (set === true) {
          if (user.username === null) {
            currentAccount = undefined;
            accountButton.innerText = "Account";
            loggedIn = false;

            if (setBehaviour === true) {
              accountButtonBehaviour((get = false), (toLogout = false));
            }
          } else {
            currentAccount = user.username;
            accountButton.innerText = currentAccount;
            loggedIn = true;

            if (setBehaviour === true) {
              accountButtonBehaviour((get = false), (toLogout = true));
            }
          }
        }
        return currentAccount;
      });
  };

  const logoutFunction = async function () {
    let data = new FormData();
    postType = "logout";

    data.append("postType", postType);

    await fetch("/account", {
      method: "POST",
      body: data,
    }).then(() => {
      // accountButtonBehaviour((get = false), (toLogout = false));
      getCurrentUsername(true, true);
      window.location.href = "/";
    });
  };

  accountButton.onclick = async function (event) {
    if (accountButtonBehaviour((get = true)) == "Logout") {
      logoutFunction();
    } else {
      const searchParams = new URLSearchParams();
      searchParams.append("res", "account");
      window.location.href = `/?${searchParams}`;
    }
  };

  const switchAccountTab = function () {
    if (emailElement.style.opacity < 1) {
      emailElement.style.opacity = 1;
      emailInputElement.required = true;
      emailInputElement.disabled = false;

      accountTab.style.height = "250px";
      createAccountLink.innerHTML = "Login with an existing account.";
      // accountForm.action = "/account/create";
    } else {
      emailElement.style.opacity = 0;
      emailInputElement.required = false;
      emailInputElement.disabled = true;

      accountTab.style.height = "0px";
      createAccountLink.innerHTML = "Create an account instead.";
      // accountForm.action = "/account";
    }
  };

  createAccountLink.onclick = function (event) {
    switchAccountTab();
  };

  const scrollElement = document.getElementById("scrollUpContainer");
  const scrollUpButton = document.querySelector("#scrollUpContainer > a");
  let scrolledDown = false;

  scrollUpButton.onclick = function () {
    globalThis.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.addEventListener("scroll", () => {
    if (document.documentElement.scrollTop >= 50) {
      if (!scrolledDown) {
        scrollElement.style.opacity = 1;
        scrollElement.style.visibility = "visible";
        scrolledDown = true;
      }
    } else {
      if (scrolledDown) {
        scrollElement.style.opacity = 0;
        scrolledDown = false;

        setTimeout(() => {
          if (!scrolledDown) {
            scrollElement.style.visibility = "hidden";
          }
        }, 1000);
      }
    }
  });

  getCurrentUsername((set = true), (setBehaviour = true));
};

window.onload = () => {
  main();
};
