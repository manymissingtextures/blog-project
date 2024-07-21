// "use strict; Use later, requires rewriting some function calls

const clickOffElements = [];

let loggedIn = false;
let currentAccount = undefined;
let confirmationCurrentlyPrompted = false;

let userSettingsArray = fetch("/usersettings", { method: "GET" })
  .then((res) => res.json())
  .then((data) => data);

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

const findItemInArray = function (array, item) {
  for (let i = 0; i < array.length; i++) {
    if (array[i][0] === item) {
      return array[i];
    }
  }
};

const main = () => {
  const settingsMain = document.getElementById("settingsMain");
  const settingsNavigation = document.getElementById("settingsNavigation");
  const navButtons = document.querySelectorAll("#settingsNavigation > a");

  const settingSections = {};

  for (let node of settingsMain.children) {
    settingSections[node.id] = node;
  }

  for (let i = 0; i < navButtons.length; i++) {
    const currentButton = navButtons[i];

    const buttonSection =
      settingSections[
        `settings_${currentButton.innerText.toLowerCase().replace(/\s/g, "")}`
      ];

    currentButton.onclick = function () {
      if (buttonSection) {
        for (let node in settingSections) {
          settingSections[node].style.display = "none";
        }
        buttonSection.style.display = "block";
      }
    };
  }

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

  const accountButton = document.getElementById("accountButton");

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
      } else {
        document.documentElement.style.setProperty(
          "--accountButtonHoverBG",
          "rgba(31, 68, 37, 0.75)"
        );
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
            document.getElementById("loggedInAccount").innerText =
              currentAccount;
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
    }
  };

  getCurrentUsername((set = true), (setBehaviour = true));
  userSettingsArray.then((list) => {
    userSettingsArray = list;

    for (settingVar in userSettingsArray) {
      const finalSetting = settingVar;
      const settingID = `us-${finalSetting}`;
      const settingSetter = document.getElementById(settingID);
      let enabled = userSettingsArray[finalSetting];

      if (settingSetter != undefined) {
        const sliderButton = document.querySelector(
          `#${settingID} .settingSliderButton`
        );
        const sliderBG = sliderButton.parentNode;
        const sliderContainer = sliderBG.parentNode;

        if (enabled == "false") {
          enabled = false;
        } else {
          enabled = true;
        }

        if (!enabled) {
          sliderBG.style.backgroundColor = "rgba(136, 48, 48, 0.75)";
          sliderButton.style.marginLeft = "0rem";
        } else {
          sliderBG.style.backgroundColor = "rgba(48, 136, 76, 0.75)";
          sliderButton.style.marginLeft = "1.5rem";
        }

        let debounce = false;

        sliderContainer.onclick = () => {
          if (!debounce) {
            debounce = true;

            setTimeout(() => {
              debounce = false;
            }, 250);

            if (enabled) {
              sliderBG.style.backgroundColor = "rgba(136, 48, 48, 0.75)";
              sliderButton.style.marginLeft = "0rem";
              enabled = false;
            } else {
              sliderBG.style.backgroundColor = "rgba(48, 136, 76, 0.75)";
              sliderButton.style.marginLeft = "1.5rem";
              enabled = true;
            }
          }
          userSettingsArray[finalSetting] = enabled;
        };
      }
    }

    const blockedUsersDiv = document.getElementById("blockedPersonsContainer");
    const blockedUsers = userSettingsArray["blocked_users"];

    for (let i = 0; i < blockedUsers.length; i++) {
      const blockedPerson_Container = document.createElement("div");
      blockedPerson_Container.className = "blockedPerson";

      const blockedPerson_H5 = document.createElement("h5");
      blockedPerson_H5.innerHTML = blockedUsers[i].username;

      const blockedPerson_P = document.createElement("p");
      blockedPerson_P.innerHTML = "Blocked on ";

      const blockedPerson_Span = document.createElement("span");
      blockedPerson_Span.innerText = blockedUsers[i].date;

      const blockedPerson_NotesContainer = document.createElement("div");
      const blockedPerson_NotesDiv = document.createElement("div");

      const blockedPerson_NotesHeading = document.createElement("h6");
      blockedPerson_NotesHeading.innerHTML = "Notes:";

      const blockedPerson_NotesP = document.createElement("p");
      blockedPerson_NotesP.innerText = `On post: ${blockedUsers[i].note}`;

      const blockedPerson_Button = document.createElement("a");
      blockedPerson_Button.className = "buttonClass";
      blockedPerson_Button.innerHTML = "Unblock";

      blockedPerson_Container.append(
        blockedPerson_H5,
        blockedPerson_P,
        blockedPerson_NotesContainer,
        blockedPerson_Button
      );

      blockedPerson_P.append(blockedPerson_Span);

      blockedPerson_NotesContainer.append(blockedPerson_NotesDiv);

      blockedPerson_NotesDiv.append(
        blockedPerson_NotesHeading,
        blockedPerson_NotesP
      );

      blockedUsersDiv.append(blockedPerson_Container);

      const storedBlockedUser = blockedUsers[i];
      blockedPerson_Button.onclick = async function () {
        // This might be mostly redundant ?
        //  Note: probably best to keep for all the checks the server does
        //        Better than just saving the json
        const formData = new FormData();
        formData.append("blocking", storedBlockedUser.username);
        formData.append("post", storedBlockedUser.post);
        formData.append("requestType", "Unblock");
        await fetch("/blockuser", {
          method: "PUT",
          body: formData,
        });
        blockedPerson_Container.remove();

        const blockedUsers = userSettingsArray["blocked_users"];
        for (let userList in blockedUsers) {
          if (blockedUsers[userList].username == storedBlockedUser.username) {
            blockedUsers.splice(userList, 1);
            break;
          }
        }
        console.log(userSettingsArray);
      };
    }
  });

  const getUserPosts = async function () {
    const userCreatedPostsContainer =
      document.getElementById("settings_yourposts");

    const userCreatedPostsDiv = document.querySelector(
      "#settings_yourposts > .settingContainer"
    );

    const nothingToShow = document.querySelector(
      "#settings_yourposts > .settingContainer > p"
    );

    await fetch(`/getuserposts/${currentAccount}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0) {
          nothingToShow.style.display = "none";
        }

        for (let i = 0; i < data.length; i++) {
          const postList = data[i];

          const postContainer = document.createElement("div");
          postContainer.className = "createdPost";

          const heading = document.createElement("h5");
          heading.innerHTML = sanitizeHTML(postList["title"]);

          const datePrefix = document.createElement("p");
          datePrefix.innerHTML = `Created on <span>${sanitizeHTML(
            postList["date"]
          )}</span>`;

          const postInteractions = document.createElement("div");
          postInteractions.className = "createdPostInteractions";

          const likesSpan = document.createElement("span");
          likesSpan.innerText = `${postList["likes"].toLocaleString()} Likes`;

          const whitespaceSpan = document.createElement("span");
          whitespaceSpan.innerHTML = "&nbsp; &#x2022; &nbsp;";

          const sharesSpan = document.createElement("span");
          sharesSpan.innerText = `${postList[
            "shares"
          ].toLocaleString()} Shares`;

          const createdPostButtonsDiv = document.createElement("div");
          createdPostButtonsDiv.className = "createdPostButtons";

          const openButton = document.createElement("a");
          openButton.innerText = "Open";
          openButton.className = "buttonClass";

          const deleteButton = document.createElement("a");
          deleteButton.innerText = "Delete";
          deleteButton.className = "buttonClass";

          postInteractions.append(likesSpan, whitespaceSpan, sharesSpan);
          createdPostButtonsDiv.append(openButton, deleteButton);
          postContainer.append(
            heading,
            datePrefix,
            postInteractions,
            createdPostButtonsDiv
          );
          userCreatedPostsDiv.append(postContainer);

          openButton.onclick = () => {
            window.location.href = `/posts/${postList["identifier"]}`;
          };

          deleteButton.onclick = () => {
            let confirmationPromise = new Promise((resolve, reject) => {
              return resolve(
                getConfirmation(
                  "Are you sure you want to permanently delete this post?"
                )
              );
            });

            confirmationPromise.then((res) => {
              if (res == true) {
                postContainer.remove();
                fetch(`/deletepost?post=${postList["identifier"]}`, {
                  method: "DELETE",
                }).then((data) => {
                  if (data.ok) {
                    notificationFunction("Successfully deleted post!");
                  } else {
                    notificationFunction("An error has occured!");
                  }
                });
              }
            });
          };
        }
      });
  };

  const deleteAccountButton = document.getElementById("deleteAccountButton");
  const closeFormButton = document.querySelector("#accountDeletionForm > a");
  const deleteAccountForm = document.getElementById("accountDeletionForm");

  deleteAccountButton.onclick = function () {
    deleteAccountForm.style.visibility = "visible";
    deleteAccountForm.style.opacity = 1;
  };

  closeFormButton.onclick = function () {
    deleteAccountForm.style.visibility = "hidden";
    deleteAccountForm.style.opacity = 0;
  };

  deleteAccountForm.onsubmit = async function (event) {
    const formData = new FormData(event.target);
    const confirmation = confirm(
      "Are you ABSOLUTELY sure you want to delete your account? You won't be able to undo it."
    );
    if (confirmation === true) {
      await fetch("/deleteaccount", {
        method: "DELETE",
        body: formData,
      })
        .then((data) => data.json())
        .then((jsonData) => {
          if (jsonData == "Success") {
            window.location.href = "/";
          }
        });
    }
  };

  const waitUntilAccount = () => {
    setTimeout(() => {
      if (currentAccount) {
        getUserPosts();
      } else {
        waitUntilAccount();
      }
    }, 100);
  };

  waitUntilAccount();
};

window.onload = () => {
  main();
};

window.onbeforeunload = async (event) => {
  const formData = new FormData();
  formData.append("userSettings", JSON.stringify(userSettingsArray));

  const saveUserSettings = await fetch("/usersettings", {
    method: "POST",
    body: formData,
  });

  saveUserSettings.then = (response) =>
    response.json().then((responseJson) => {
      console.log(responseJson);
    });

  const confirmationMessage = "Settings saved potentially";
  event.returnValue = confirmationMessage;
  return confirmationMessage;
};
