const admin = require("firebase-admin");
const functions = require("firebase-functions");

serviceAccount = require('./serviceAccountKey.json');
const adminConfig = JSON.parse(process.env.FIREBASE_CONFIG);
adminConfig.credential = admin.credential.cert(serviceAccount);

admin.initializeApp(adminConfig);


// admin.initializeApp(functions.config(config).firebase);

const firestore = admin.firestore();

const defaultRegion = "asia-south1";

// references
const inviteCodesRef = firestore.collection("inviteCodes");
const pointsRef = firestore.collection("points");
const pointsWalletRef = firestore.collection("pointsWallet");
const campaignRef = firestore.collection("campaign");
const usersRef = firestore.collection("users");

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
        const listRef = firebase.collection('listOfIds').doc('users')
        listRef.update({
            ids: admin.firestore.FieldValue.arrayUnion(user.uid),
            lastUpdated: Date.now(),
            lastAction: "Add User"
        })
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
        const listRef = firebase.collection('listOfIds').doc('users')
        listRef.update({
            ids: admin.firestore.FieldValue.arrayRemove(user.uid),
            lastUpdated: Date.now(),
            lastAction: "Remove User"
        })
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
        const listRef = firebase.collection('listOfIds').doc('campaigns')
        listRef.update({
            ids: admin.firestore.FieldValue.arrayUnion(context.params.docId),
            lastUpdated: Date.now(),
            lastAction: "Add Campaign"
        })
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
        const listRef = firebase.collection('listOfIds').doc('campaigns')
        listRef.update({
            ids: admin.firestore.FieldValue.arrayRemove(context.params.docId),
            lastUpdated: Date.now(),
            lastAction: "Remove Campaign"
        })
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
        const listRef = firebase.collection('listOfIds').doc('companies')
        listRef.update({
            ids: admin.firestore.FieldValue.arrayUnion(context.params.docId),
            lastUpdated: Date.now(),
            lastAction: "Add Company"
        })
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
        const listRef = firebase.collection('listOfIds').doc('companies')
        listRef.update({
            ids: admin.firestore.FieldValue.arrayRemove(context.params.docId),
            lastUpdated: Date.now(),
            lastAction: "Remove Company"
        })
    });

exports.onCreateTaskSetId = functions
    .region(defaultRegion)
    .firestore.document('campaign/{docId}/tasks/{taskId}')
    .onCreate(async (snap, context) => {
        const campaignId = snap.params.campaignId;
        const taskId = snap.params.taskId;
        campaignRef.doc(`${campaignId}/tasks/${taskId}`).set({ id: taskId }, { merge: true })
        // .then(() => {
        //     return JSON.stringify({ success: true });
        // }).catch((err) => {
        //     return JSON.stringify({ success: false, error: err });
        // })
    });


// cron for tasks schedule
exports.dailyJob = functions
    .region(defaultRegion).pubsub.schedule('30 0 * * *').onRun(context => {
        runTaskSchedule();
    });
// cloud functions for admin panel only
// GET ADMINS LIST
// GET EXECUTIVES LIST
// CREATE USERS
exports.createuserbyadminpanel2 = functions
    .region(defaultRegion)
    .https.onCall(async (data, context) => {
        // if (!context.auth && !context.auth.token.admin) {
        if (!context.auth) {
            return {
                success: false, error: {
                    message: 'Only admin can permit'
                }
            };
            // throw new functions.https.HttpsError(
            //     'permission-denied',
            //     'Only admin can permit',
            // )
        }
        // console.log(data);
        const user = {
            email: data.email,
            password: data.password,
            displayName: data.displayName,
            phoneNumber: data.phoneNumber
        }

        return admin.auth().createUser(user).then(async (userRecord) => {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log("Created User in Authentication, now storing in Realtime Database...");

            // Add flag for admin and delete password before storing in RT DB
            user.emailVerified = false;
            user.phoneNumberVerify = false;
            user.inviteCode = 'PL0011223344';
            user.myInviteCode = getRandomNumber();
            user.country = 'IN';
            user.uid = userRecord.uid;
            user.claim = data.claim;
            user.completedTasks = 0;
            user.state = '';
            user.city = '';
            user.dob = '';
            user.photoURL = '';
            delete user["password"];

            var newUserRef = firestore.doc("users/" + userRecord.uid);
            return newUserRef.set(user).then(() => {
                return JSON.stringify({ success: true });
            }).catch((err) => {
                return JSON.stringify({ success: false, error: err });
            })
        }).catch((error) => {
            console.log("Error creating new user:", error);
            return JSON.stringify({ success: false, error: error });
        });
    })

// set only maximum 500 batches - aggined tasks updates into batches of 499/500 and remove starting the function again
// exports.assignTask = ()

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
    const campaignsToReturn = [];
    campaignRef.where("status", "==", "pending").get().then(async (querySnapshot) => {
        if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
                const docData = doc.data();
                if (docData.hits <= docData.completedhits) {
                    campaignRef.doc(doc.id).set({ status: "complete" });
                } else {
                    const dataToPush = docData;
                    dataToPush.id = doc.id;
                    campaignsToReturn.push(dataToPush);
                }
                console.log(doc.id, " => ", doc.data());
            });
        }
    });
    console.log(campaignsToReturn)

    // if (!snapshot.empty) {
    //     snapshot.forEach((doc) => {
    //     });
    // }
    return campaignsToReturn;
};

const runTaskSchedule = async (data = null, context = null) => {
    // if (!context.auth) {
    //     return {
    //         success: false, error: {
    //             message: 'Only admin can permit'
    //         }
    //     };
    // }
    // get all campaigns data where hits > completedHits
    // suppose we have 5 campaign
    // const allRunningCampaigns = getRunnigCampaigns();
    // we need to check whether there is campaign available to run or not
    const referenceX = await campaignRef.where('status', '==', 'pending').get();
    if (referenceX.empty) {
        console.log('No campaigns found')
        return JSON.stringify({ success: false, error: { message: 'No campaigns found' } });
    }

    // return referenceX.then(async (querySnapshot) => {
    //     console.log('line:408')
    //     console.log(querySnapshot);
    //     if (querySnapshot.length > 0) {
    console.log('line:410')
    return referenceX.forEach(async (doc) => {
        const docData = doc.data();
        if (docData.hits <= docData.completedhits) {
            campaignRef.doc(doc.id).set({ status: "complete" });
        } else {
            console.log(doc.id, " => ", doc.data());
            let currentCampaign = docData;
            currentCampaign.id = doc.id;
            // allRunningCampaigns.forEach((currentCampaign) => {
            // starting to get non-completing tasks from current campaign
            // select from collection("campaigns).doc(currentCampaign.id).collection("tasks)
            // FIRST GET ALL ALLOTED TASKS LIST
            // .where allotedDate == yesterdayDateOnly OR allotedDate >= yesterdayDateOnly && isExpired == false
            var yesterdayDate = getDateOnly(false);

            let tasksList = [];
            const tasksWhichIsNotCompletedYet = await campaignRef
                .doc(doc.id)
                .collection("tasks")
                .where("allotedDate", ">=", yesterdayDate)
                .where("isExpired", "==", false)
                .get()

            if (!tasksWhichIsNotCompletedYet.empty) {
                tasksWhichIsNotCompletedYet.forEach(async (task) => {
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
                            batch.update({ isExpired: true }, sfRef);
                        });
                        batch.commit();
                    });
                } else {
                    completedTasksList.forEach((task, index) => {
                        const sfRef = campaignRef
                            .doc(currentCampaign.id)
                            .collection("tasks")
                            .doc(task.id);
                        batch.update({ isExpired: true }, sfRef);
                    });
                    batch.commit();
                }

                // COUNTINGS
                countNotCompletedTasksList = notCompletedTasksList.length;
                countAwaitingApprovalTasksList = awaitingApprovalTasksList.length;
                countCompletedTasksList = completedTasksList.length;

                // update campaign by completedTasks.length with condition
                if (completedTasksList.length > 0) {
                    campaignRef
                        .doc(currentCampaign.id)
                        .set({ completedhits: countCompletedTasksList }, { merge: true });
                }
            }

            var neededToComplete =
                currentCampaign.hits -
                (countNotCompletedTasksList + countAwaitingApprovalTasksList); // suppose hits-1000 / completed-300 / need 700 / nc-600 / alloted-900
            // LIST OF USERS_ID"s WHERE THOSE TASKS ARE NOT ASSIGNED WITH LIMIT (suppose we need 200 users)
            // users list for exclude from the list =
            let usersListX = [];
            let newUserIds = [];
            let newUsersCount = 0;
            if (usersNotCompletedIds.length > 0 || usersCompletedIds.length > 0) {
                usersListX = [...usersNotCompletedIds, ...usersCompletedIds];
                console.log(usersListX);
                const users1 = await usersRef
                    .where("uid", "not-in", usersListX)
                    .limit(neededToComplete)
                    .get();
                // CHECK IF USERLIST HAVE ALL 200 USER OR NOT = suppose 500
                if (!users1.empty) {
                    console.log('usersRef running')
                    users1.forEach((doc) => {
                        newUserIds.push({ id: doc.id, name: doc.data().displayName });
                    });
                    newUsersCount = users1._size;
                    console.log(newUsersCount);
                }
            } else {
                const users1 = await usersRef
                    .limit(neededToComplete)
                    .get();
                // CHECK IF USERLIST HAVE ALL 200 USER OR NOT = suppose 500
                if (!users1.empty) {
                    console.log('usersRef running')
                    users1.forEach((doc) => {
                        newUserIds.push({ id: doc.id, email: doc.data().email, name: doc.data().displayName });
                    });
                    newUsersCount = users1._size;
                    console.log(newUsersCount);
                }
            }

            // let notCompletedLengthToSplice = 0;
            // const userListDifference = neededToComplete - newUsersCount; // suppose 200
            // if (userListDifference !== 0) {
            //     console.log('if (userListDifference !== 0)')
            //     if (usersNotCompletedIds.length > userListDifference) {
            //         notCompletedLengthToSplice =
            //             usersNotCompletedIds.length - userListDifference;
            //     } else {
            //         notCompletedLengthToSplice =
            //             userListDifference - usersNotCompletedIds.length;
            //     }
            //     console.log('notCompletedLengthToSplice');
            //     console.log(userListDifference);
            //     console.log(usersNotCompletedIds.length);
            //     console.log(notCompletedLengthToSplice);
            //     // if (notCompletedLengthToSplice > 0) {
            //     //     var spliceIndex = parseInt(notCompletedLengthToSplice - 1);
            //     //     var userTasksToMakeItExpired = usersNotCompletedIds.slice(
            //     //         0,
            //     //         spliceIndex
            //     //     ); // getting 400 users

            //     //     console.log('userTasksToMakeItExpired');
            //     //     console.log(userTasksToMakeItExpired);

            //     //     console.log('batch2 should start from here...')
            //     //     const batch2 = firestore.batch();
            //     //     if (userTasksToMakeItExpired.length > 499) {
            //     //         console.log('batch2 start to commit...')
            //     //         var chunkSize = Math.ceil(userTasksToMakeItExpired.length / 499)
            //     //         const slicedList = sliceIntoChunks(userTasksToMakeItExpired, chunkSize);

            //     //         console.log(slicedList);
            //     //         slicedList.forEach((userTasksToMakeItExpiredChunk, index) => {
            //     //             const sfRef = campaignRef
            //     //                 .doc(currentCampaign.id)
            //     //                 .collection("tasks")
            //     //                 .where("uid", "in", userTasksToMakeItExpiredChunk).get()
            //     //                 .then(response => {
            //     //                     response.docs.forEach((doc) => {
            //     //                         const taskUid = doc.id;
            //     //                         console.log('docReference == X');
            //     //                         console.log(taskUid);

            //     //                         const docRef = campaignRef.doc(`${currentCampaign.id}/tasks/${doc.id}`);
            //     //                         batch2.update(docRef, { isExpired: true });
            //     //                     })
            //     //                     batch2.commit().then(() => {
            //     //                         console.log(`updated all documents inside batch 2`)
            //     //                     })
            //     //                 })
            //     //         });
            //     //     } else {
            //     //         console.log('batch2 start to commit ... else method ...')
            //     //         const sfRef = campaignRef
            //     //             .doc(currentCampaign.id)
            //     //             .collection("tasks")
            //     //             .where("uid", "in", userTasksToMakeItExpired).get()
            //     //             .then(response => {
            //     //                 response.docs.forEach((doc) => {
            //     //                     const taskUid = doc.id;
            //     //                     console.log('docReference == X');
            //     //                     console.log(taskUid);

            //     //                     const docRef = campaignRef.doc(`${currentCampaign.id}/tasks/${doc.id}`);
            //     //                     batch2.update(docRef, { isExpired: true });
            //     //                 })
            //     //                 batch2.commit().then(() => {
            //     //                     console.log(`updated all documents inside batch 2`)
            //     //                 })
            //     //             })
            //     //     }
            //     // }
            // } else {
            //     console.log('if (userListDifference == 0)')
            // }

            // TASKS ALLOTING STARTED
            // allot tasks to user with push notification
            // console.log('batch 3')
            // const batch3 = firestore.batch();


            let completedBatches = 0;
            if (newUserIds.length > 499) {
                console.log('if (newUserIds.length > 499) ')
                var chunkSize = Math.ceil(newUserIds.length / 499)
                const slicedList = sliceIntoChunks(newUserIds, chunkSize);

                slicedList.forEach(async (newUserIdsChunk, index) => {
                    let indexing = 0;
                    await newUserIdsChunk.forEach(async (userData, index2) => {
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
                            uid: userData.id,
                            userEmail: userData.email,
                            userName: userData.displayName,
                            url: currentCampaign.url,
                            allotedDateNum: Date.now(),
                            allotedDate: formatDate(Date.now()),
                            approvedDate: 0,
                            pointPerTask: currentCampaign.pointPerTask,
                            isExpired: false,
                            howToTask: {
                                title: currentCampaign.howToTask.title,
                                image: currentCampaign.howToTask.image,
                                description: currentCampaign.howToTask.description
                            }
                        }

                        await campaignRef
                            .doc(currentCampaign.id)
                            .collection("tasks").add(newTask).then(() => {
                                // completedBatches += 1;
                                if (index2 == (newUserIdsChunk.length - 1)) {
                                    indexing += 1;
                                }
                            })
                    });
                    var slicedListCalculation = (slicedList.length * indexing) - 1;
                    if (index == slicedListCalculation) {
                        var numberToReturn = slicedListCalculation + 1;
                        return JSON.stringify({ success: true, msg: 'total tasks alloted ' + numberToReturn })
                    }
                });
                console.log('completedBatches');
                console.log(completedBatches);
            } else {
                console.log('if (newUserIds.length < 499) ')
                console.log(newUserIds);
                newUserIds.forEach(async (userData, index) => {
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
                        uid: userData.id,
                        userEmail: userData.email,
                        userName: userData.displayName,
                        url: currentCampaign.url,
                        allotedDateNum: Date.now(),
                        allotedDate: formatDate(Date.now()),
                        approvedDate: 0,
                        pointPerTask: currentCampaign.pointPerTask,
                        isExpired: false,
                        howToTask: {
                            title: currentCampaign.howToTask.title,
                            image: currentCampaign.howToTask.image,
                            description: currentCampaign.howToTask.description
                        }
                    }
                    await campaignRef
                        .doc(currentCampaign.id)
                        .collection("tasks").add(newTask).then(() => {
                            if (index == (newUserIds.length - 1)) {
                                return JSON.stringify({ success: true, msg: 'total tasks alloted ' + newUserIds.length })
                            }
                            // completedBatches += 1;
                        })
                    // batch3.create(newTaskRef, newTask);
                    // batch3.commit().then(() => {
                    //     console.log('batch commited');
                    // }).catch((err) => {
                    //     console.log("batch_error", "=>", err)
                    // })
                });
                console.log('completedBatches');
                // console.log(completedBatches);
            }
            // });
        }
    });
    return JSON.stringify({ success: true });

}
exports.assigningtasks = functions
    .region(defaultRegion)
    .https.onCall(async (data, context) => {
        runTaskSchedule(data, context);
    });
