// const admin = require("firebase-functions");
// const firestore = functions.firestore;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);

// const serviceAccount = require("./helpers/serviceAccountKey2.json");

// admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
// });

const firestore = admin.firestore();

const defaultRegion = "asia-south1";

// references
const inviteCodesRef = firestore.collection("inviteCodes");
const pointsRef = firestore.collection("points");
const pointsWalletRef = firestore.collection("pointsWallet");
const campaignRef = firestore.collection("campaign");

/**
 * Adds two numbers together.
 * @param {boolean} today The first number.
 * @return {string} The sum of the two numbers.
 */
function getDateOnly(today = true) {
    const dateTime = new Date();
    let day = dateTime.getDate();
    if (!today) {
        day = dateTime.getDate() - 1;
    }
    let month = dateTime.getMonth();
    const year = dateTime.getFullYear();

    // if (month >= 1 && month <= 9) {
    //     month = "0" + month;
    // }

    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;

    // const date = day + "-" + month + "-" + year;
    // console.log(date);
    // return date;
    return [day, month, year].join('');
}
const getRandomNumber = () => {
    const string = 'PL';
    return string + Date.now().toString().substring(0, 10);
}
/**
 * Adds two numbers together.
 * @param {number} date The first number.
 * @return {string} The sum of the two numbers.
 */
function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;

    // return [day, month, year].join('-');
    return [day, month, year].join('');
}

function sliceIntoChunks(arr, chunkSize) {
    const res = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        res.push(chunk);
    }
    return res;
}
// getting & updating running campaigns
const getRunnigCampaigns = () => {
    const snapshot = campaignRef.where("status", "==", "pending").get();
    const campaignsToReturn = [];
    if (!snapshot.empty) {
        snapshot.forEach((doc) => {
            const docData = doc.data();
            if (docData.hits <= docData.completedhits) {
                campaignRef.doc(doc.id).set({ status: "complete" });
            } else {
                const dataToPush = docData;
                dataToPush.id = doc.id;
                campaignsToReturn.push(dataToPush);
            }
        });
    }
    return campaignsToReturn;
};

// when user registered and his/her doc was created - set user claim
exports.onCreateUserDocument = functions
    .region(defaultRegion)
    .firestore.document('users/{userId}')
    .onCreate((snap, context) => {
        const userId = snap.id;
        firestore
            .doc(`users/${userId}`)
            .get()
            .then((data) => {
                const thisData = data.data();
                // const inviteCodeX = snap.data().inviteCode;
                inviteCodesRef.doc(userId).set({
                    uid: userId,
                    code: thisData.myInviteCode,
                    name: thisData.displayName,
                });
                if (thisData.claim == 'user') {
                    admin
                        .auth()
                        .setCustomUserClaims(userId, { user: true })
                        .then((result) => {
                            // console.log("user claim set");
                        }).catch((err) => {
                            console.log(err);
                        })
                }
                if (thisData.claim == 'executive') {
                    admin
                        .auth()
                        .setCustomUserClaims(userId, { executive: true })
                        .then((result) => {
                            // console.log("user claim set");
                        }).catch((err) => {
                            console.log(err);
                        })
                }
                if (thisData.claim == 'admin') {
                    admin
                        .auth()
                        .setCustomUserClaims(userId, { admin: true })
                        .then((result) => {
                            // console.log("user claim set");
                        }).catch((err) => {
                            console.log(err);
                        })
                }
                const userIdForCurrentUser = snap.id;
                firestore
                    .doc(`users/${userIdForCurrentUser}`)
                    .get()
                    .then((user) => {
                        const verifiedUser = user.data();
                        //   const verifiedUserId = user.id;
                        const inviteCodeX = verifiedUser.inviteCode;

                        inviteCodesRef
                            .where("code", "==", inviteCodeX)
                            .get()
                            .then((inviteCode) => {
                                const codes = [];
                                inviteCode.forEach((sCode) => {
                                    const code = sCode.data();
                                    code.id = sCode.id;
                                    codes.push(code);
                                });
                                if (codes && codes.length > 0) {
                                    const currentCode = codes[0];
                                    const mainUser = currentCode.uid;
                                    const mainUserDisplayName = currentCode.name;

                                    firestore
                                        .doc(`users/${mainUser}`)
                                        .get()
                                        .then((refUser) => {
                                            const refUserData = refUser.data();
                                            const totalReferrals = refUserData.totalReferrals;
                                            let pointsToGive = 5;
                                            if (totalReferrals && totalReferrals > 0) {
                                                if (totalReferrals >= 10) {
                                                    pointsToGive = 3;
                                                }
                                                if (totalReferrals >= 20) {
                                                    pointsToGive = 2;
                                                }
                                            }
                                            pointsRef
                                                .add({
                                                    points: pointsToGive,
                                                    referedUserName: verifiedUser.displayName,
                                                    referedUserUid: verifiedUser.uid,
                                                    type: "refer",
                                                    uid: mainUser,
                                                    taskId: "",
                                                    taskPlatform: "",
                                                    taskPlatformItem: "",
                                                    dateCreated: Date.now(),
                                                })
                                                .then(() => {
                                                    firestore.doc(`pointsWallet/${mainUser}`).update({
                                                        currentPoints: admin.firestore.FieldValue.increment(pointsToGive),
                                                        totalPoints: admin.firestore.FieldValue.increment(pointsToGive),
                                                    }).then(() => {
                                                        // console.log('main user wallet updated');
                                                        firestore.doc(`users/${mainUser}`).update({
                                                            totalReferrals: admin.firestore.FieldValue.increment(1)
                                                        }).then(() => {
                                                            // console.log('main user profile updated');
                                                        }).catch((err) => {
                                                            console.log(err);
                                                        })
                                                    }).catch((err) => {
                                                        console.log(err);
                                                    })
                                                });
                                        });
                                }
                            });
                    });
            }).then(() => {
                // console.log("onCreateUserDocument function complete");
            }).catch((err) => {
                console.log(err);
            })
    });

// set only maximum 500 batches - aggined tasks updates into batches of 499/500 and remove starting the function again
// exports.assignTask = ()
exports.assigningTasks = functions
    .region(defaultRegion).https.onCall((data, context) => {
        if (!context.auth.token.admin) {
            throw new HttpsError("permission-denied");
        } else {
            // get all campaigns data where hits > completedHits
            // suppose we have 5 campaign
            const allRunningCampaigns = getRunnigCampaigns();
            // we need to check whether there is campaign available to run or not
            if (allRunningCampaigns.length > 0) {
                // we need to create forEach loop here
                // loop forEach start
                // var currentCampaign = allRunningCampaigns
                allRunningCampaigns.forEach((currentCampaign) => {
                    // starting to get non-completing tasks from current campaign
                    // select from collection("campaigns).doc(currentCampaign.id).collection("tasks)
                    // FIRST GET ALL ALLOTED TASKS LIST
                    // .where allotedDate == yesterdayDateOnly OR allotedDate >= yesterdayDateOnly && isExpired == false
                    var yesterdayDate = getDateOnly(false);

                    let tasksList = [];
                    const tasksWhichIsNotCompletedYet = campaignRef
                        .doc(currentCampaign.id)
                        .collection("tasks")
                        .where("allotedDate", ">=", yesterdayDate)
                        .where("isExpired", "==", false)
                        .get();
                    if (!tasksWhichIsNotCompletedYet.empty) {
                        tasksWhichIsNotCompletedYet.forEach((task) => {
                            var thisTask;
                            thisTask = task.data();
                            thisTask.id = task.id;
                            //  = { id, ...task.data() }
                            tasksList.push(thisTask);
                        });
                    }

                    // only if list is founded
                    let notCompletedTasksList = [];
                    let awaitingApprovalTasksList = [];
                    let completedTasksList = [];

                    let usersNotCompletedIds = []; // suppose 180
                    let usersCompletedIds = [];

                    // COUNTINGS
                    let countNotCompletedTasksList = 0;
                    let countAwaitingApprovalTasksList = 0;
                    let countCompletedTasksList = 0;

                    if (tasksList.length > 0) {
                        notCompletedTasksList = tasksList.filter((task) => {
                            return task.isSubmitted == false && task.isApproved == false;
                        });
                        notCompletedTasksList.forEach((task) => {
                            usersNotCompletedIds.push(task.uid);
                        });

                        awaitingApprovalTasksList = tasksList.filter((task) => {
                            return task.isSubmitted == true && task.isApproved == false;
                        });

                        completedTasksList = tasksList.filter((task) => {
                            return task.isSubmitted == true && task.isApproved == true;
                        });
                        completedTasksList.forEach((task) => {
                            usersCompletedIds.push(task.uid);
                        });

                        // need to expire complete tasks also ///////////////////////////
                        const batch = firestore.batch();
                        if (completedTasksList.length > 499) {
                            var chunkSize = Math.ceil(completedTasksList.length / 499)
                            const slicedList = sliceIntoChunks(completedTasksList, chunkSize);

                            slicedList.forEach((completedTasksListChunk, index) => {
                                completedTasksListChunk.forEach((task, index) => {
                                    const sfRef = campaignRef
                                        .doc(currentCampaign.id)
                                        .collection("tasks")
                                        .doc(task.id);
                                    batch.update(sfRef, { isExpired: true });
                                });
                                batch.commit();
                            });
                        } else {
                            completedTasksList.forEach((task, index) => {
                                const sfRef = campaignRef
                                    .doc(currentCampaign.id)
                                    .collection("tasks")
                                    .doc(task.id);
                                batch.update(sfRef, { isExpired: true });
                            });
                            batch.commit();
                        }

                        // COUNTINGS
                        countNotCompletedTasksList = notCompletedTasksList.length;
                        countAwaitingApprovalTasksList = awaitingApprovalTasksList.length;
                        countCompletedTasksList = completedTasksList.length;

                        // update campaign by completedTasks.length with condition
                        if (countCompletedTasksList > 0) {
                            campaignRef
                                .doc(currentCampaign.id)
                                .set({ completedhits: countCompletedTasksList });
                        }
                    }

                    var neededToComplete =
                        currentCampaign.hits -
                        (countNotCompletedTasksList + countAwaitingApprovalTasksList); // suppose hits-1000 / completed-300 / need 700 / nc-600 / alloted-900
                    // LIST OF USERS_ID"s WHERE THOSE TASKS ARE NOT ASSIGNED WITH LIMIT (suppose we need 200 users)
                    // users list for exclude from the list =
                    let usersListX = [];
                    let users1 = [];
                    if (usersNotCompletedIds.length > 0 || usersCompletedIds.length > 0) {
                        usersListX = [...usersNotCompletedIds, ...usersCompletedIds];
                        users1 = usersRef
                            .where("uid", "not-in", usersListX)
                            .limit(neededToComplete)
                            .get();
                    }
                    let newUserIds = [];
                    let newUsersCount = 0;
                    // CHECK IF USERLIST HAVE ALL 200 USER OR NOT = suppose 500
                    if (users1.length > 0) {
                        users1.forEach((doc) => {
                            newUserIds.push(doc.id);
                        });
                        newUsersCount = users1.length;
                    }

                    let notCompletedLengthToSplice = 0;
                    const userListDifference = neededToComplete - newUsersCount; // suppose 200
                    if (userListDifference !== 0) {
                        notCompletedLengthToSplice =
                            usersNotCompletedIds.length - userListDifference; // result suppose 600-200 = 400
                        if (notCompletedLengthToSplice > 0) {
                            var spliceIndex = parseInt(notCompletedLengthToSplice - 1);
                            var userTasksToMakeItExpired = usersNotCompletedIds.slice(
                                0,
                                spliceIndex
                            ); // getting 400 users

                            // userTasksToMakeItExpired.forEach(async (user_id) => {
                            //   campaignRef.doc(currentCampaign.id).collection("tasks").where("uid", "==", user_id).set({ isExpired: true });
                            // });

                            const batch = firestore.batch();
                            if (userTasksToMakeItExpired.length > 499) {
                                var chunkSize = Math.ceil(userTasksToMakeItExpired.length / 499)
                                const slicedList = sliceIntoChunks(userTasksToMakeItExpired, chunkSize);

                                slicedList.forEach((userTasksToMakeItExpiredChunk, index) => {
                                    userTasksToMakeItExpiredChunk.forEach((user_id, index) => {
                                        const sfRef = campaignRef
                                            .doc(currentCampaign.id)
                                            .collection("tasks")
                                            .where("uid", "==", user_id);
                                        batch.update(sfRef, { isExpired: true });
                                    });
                                    batch.commit();
                                });
                            } else {
                                userTasksToMakeItExpired.forEach((user_id, index) => {
                                    const sfRef = campaignRef
                                        .doc(currentCampaign.id)
                                        .collection("tasks")
                                        .where("uid", "==", user_id);
                                    batch.update(sfRef, { isExpired: true });
                                });
                                batch.commit();
                            }
                        }
                    }

                    // TASKS ALLOTING STARTED
                    // allot tasks to user with push notification
                    // newUserIds.forEach(async (user_id) => {
                    //   newTask.uid = user_id
                    //   campaignRef.doc(currentCampaign.id).collection("tasks").add(newTask);
                    // })
                    const batch = firestore.batch();

                    if (newUserIds.length > 499) {
                        var chunkSize = Math.ceil(newUserIds.length / 499)
                        const slicedList = sliceIntoChunks(newUserIds, chunkSize);

                        slicedList.forEach((newUserIdsChunk, index) => {
                            newUserIdsChunk.forEach((user_id, index) => {
                                const newTask = {
                                    approvedBy: "",
                                    campaignId: currentCampaign.id,
                                    inProgress: false,
                                    isAlloted: true,
                                    isApproved: false,
                                    isRejected: false,
                                    isSubmitted: false,
                                    platform: currentCampaign.platform,
                                    platformTask: currentCampaign.platformTask,
                                    proof: "",
                                    rejectReason: "",
                                    rejectedBy: "",
                                    uid: user_id,
                                    url: currentCampaign.url,
                                    allotedDateNum: Date.now(),
                                    allotedDate: formatDate(Date.now()),
                                    approvedDate: 0,
                                    isExpired: false,
                                }
                                const newTaskRef = campaignRef
                                    .doc(currentCampaign.id)
                                    .collection("tasks");
                                batch.create(newTaskRef, newTask);
                            });
                            batch.commit();
                        });
                    } else {
                        newUserIds.forEach((user_id, index) => {
                            const newTask = {
                                approvedBy: "",
                                campaignId: currentCampaign.id,
                                inProgress: false,
                                isAlloted: true,
                                isApproved: false,
                                isRejected: false,
                                isSubmitted: false,
                                platform: currentCampaign.platform,
                                platformTask: currentCampaign.platformTask,
                                proof: "",
                                rejectReason: "",
                                rejectedBy: "",
                                uid: user_id,
                                url: currentCampaign.url,
                                allotedDateNum: Date.now(),
                                allotedDate: formatDate(Date.now()),
                                approvedDate: 0,
                                isExpired: false,
                            }
                            const newTaskRef = campaignRef
                                .doc(currentCampaign.id)
                                .collection("tasks");
                            batch.create(newTaskRef, newTask);
                        });
                        batch.commit();
                    }
                });
                //loop// forEach ends
            }
        }
    });

// counters
exports.countOnUserCreate2 = functions
    .region(defaultRegion)
    // .firestore.document('users/{userId}')
    .auth.user()
    .onCreate((user) => {
        const docRef = firestore.doc('counts/users');
        docRef.update({
            now: admin.firestore.FieldValue.increment(1),
            total: admin.firestore.FieldValue.increment(1),
        });
    });
exports.countOnUserDelete2 = functions
    .region(defaultRegion)
    // .firestore.document('users/{userId}')
    .auth.user()
    .onDelete((user) => {
        const userId = user.uid;
        const docRef = firestore.doc('counts/users');
        docRef.update({
            deleted: admin.firestore.FieldValue.increment(1),
            now: admin.firestore.FieldValue.increment(-1),
        });
        firestore.doc(`pointsWallet/${userId}`).delete()
        firestore.doc(`users/${userId}`).delete();
    });
exports.countOnCampaignCreate = functions
    .region(defaultRegion)
    .firestore.document('campaign/{docId}')
    .onCreate((snap, context) => {
        const docRef = firestore.doc('counts/campaigns');
        docRef.update({
            now: admin.firestore.FieldValue.increment(1),
            total: admin.firestore.FieldValue.increment(1),
        });
    });
exports.countOnCampaignDelete = functions
    .region(defaultRegion)
    .firestore.document('campaign/{docId}')
    .onDelete((snap, context) => {
        const docRef = firestore.doc('counts/campaigns');
        docRef.update({
            deleted: admin.firestore.FieldValue.increment(1),
            now: admin.firestore.FieldValue.increment(-1),
        });
    });
exports.countOnCompanyCreate = functions
    .region(defaultRegion)
    .firestore.document('company/{docId}')
    .onCreate((snap, context) => {
        const docRef = firestore.doc('counts/companies');
        docRef.update({
            now: admin.firestore.FieldValue.increment(1),
            total: admin.firestore.FieldValue.increment(1),
        });
    });
exports.countOnCompanyDelete = functions
    .region(defaultRegion)
    .firestore.document('company/{docId}')
    .onDelete((snap, context) => {
        const docRef = firestore.doc('counts/companies');
        docRef.update({
            deleted: admin.firestore.FieldValue.increment(1),
            now: admin.firestore.FieldValue.increment(-1),
        });
    });

// cloud functions for admin panel only
// CREATE USERS
exports.createuserbyadminpanel = functions
    .region(defaultRegion)
    .https.onCall((data, context) => {
        if (!context.auth && !context.auth.token.admin) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only admin can permit',
            )
        }
        console.log(data);
        const requestedUser = {
            email: data.email,
            password: data.password,
            displayName: data.displayName,
            phoneNumber: data.phoneNumber
        }
        // const data = {
        //     email: 'userbyfunction@mailinator.com',
        //     password: '23988725',
        //     displayName: 'Cloud User',
        //     phoneNumber: '+919595963215',
        //     claim: 'user'
        // }
        return admin.auth().createUser(requestedUser).then(async (userRecord) => {
            const user = {
                email: data.email,
                emailVerified: false,
                displayName: data.displayName,
                phoneNumber: data.phoneNumber,
                phoneNumberVerify: false,
                inviteCode: 'PL0011223344',
                myInviteCode: getRandomNumber(),
                state: '',
                city: '',
                country: 'IN',
                uid: userRecord.uid,
                claim: data.claim,
                completedTasks: 0,
                dob: '',
                photoURL: ''
            }
            await firestore.collection('users').doc(userRecord.uid).set(user);
        }).catch((err) => {
            throw new functions.https.HttpsError(
                'aborted',
                err
            )
        })
    })
