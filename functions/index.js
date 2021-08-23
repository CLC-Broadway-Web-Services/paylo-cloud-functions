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
    .onCreate(async (snap, context) => {
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
    .onCreate(async (user) => {
        const docRef = firestore.doc('counts/users');
        docRef.update({
            now: admin.firestore.FieldValue.increment(1),
            total: admin.firestore.FieldValue.increment(1),
        });
        const listRef = firestore.collection('listOfIds').doc('users')
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
    .onDelete(async (user) => {
        const userId = user.uid;
        const docRef = firestore.doc('counts/users');
        docRef.update({
            deleted: admin.firestore.FieldValue.increment(1),
            now: admin.firestore.FieldValue.increment(-1),
        });
        firestore.doc(`pointsWallet/${userId}`).delete()
        firestore.doc(`users/${userId}`).delete();
        const listRef = firestore.collection('listOfIds').doc('users')
        listRef.update({
            ids: admin.firestore.FieldValue.arrayRemove(user.uid),
            lastUpdated: Date.now(),
            lastAction: "Remove User"
        })
    });
exports.countOnCampaignCreate = functions
    .region(defaultRegion)
    .firestore.document('campaign/{campaignId}')
    .onCreate(async (snap, context) => {
        const campaignId = await context.params.campaignId;
        campaignRef.doc(`${campaignId}`).set({ id: campaignId }, { merge: true });

        const docRef = firestore.doc('counts/campaigns');
        docRef.update({
            now: admin.firestore.FieldValue.increment(1),
            total: admin.firestore.FieldValue.increment(1),
        });
        const listRef = firestore.collection('listOfIds').doc('campaigns')
        listRef.update({
            ids: admin.firestore.FieldValue.arrayUnion(campaignId),
            lastUpdated: Date.now(),
            lastAction: "Add Campaign"
        })
        const tasksCountingData = {
            submittedTasks: 0,
            submittedTasksUsers: [],
            rejectedTasks: 0,
            rejectedTasksUsers: [],
            approvedTasks: 0,
            approvedTasksUsers: [],
            expiredTasks: 0,
            expiredTasksUsers: [],
            allotedTasks: 0,
            allotedTasksUsers: [],
            created: Date.now(),
        }
        await campaignRef.doc(`${campaignId}/stats/alltasksStats`).set(tasksCountingData, { merge: false });
    });
exports.countOnCampaignDelete = functions
    .region(defaultRegion)
    .firestore.document('campaign/{docId}')
    .onDelete(async (snap, context) => {
        const docRef = firestore.doc('counts/campaigns');
        docRef.update({
            deleted: admin.firestore.FieldValue.increment(1),
            now: admin.firestore.FieldValue.increment(-1),
        });
        const listRef = firestore.collection('listOfIds').doc('campaigns')
        listRef.update({
            ids: admin.firestore.FieldValue.arrayRemove(context.params.docId),
            lastUpdated: Date.now(),
            lastAction: "Remove Campaign"
        })
    });
exports.countOnCompanyCreate = functions
    .region(defaultRegion)
    .firestore.document('company/{docId}')
    .onCreate(async (snap, context) => {
        const companyId = await context.params.docId;
        firestore.doc(`company/${companyId}`).set({ id: companyId }, { merge: true });

        const docRef = firestore.doc('counts/companies');
        docRef.update({
            now: admin.firestore.FieldValue.increment(1),
            total: admin.firestore.FieldValue.increment(1),
        });
        const listRef = firestore.collection('listOfIds').doc('companies')
        listRef.update({
            ids: admin.firestore.FieldValue.arrayUnion(companyId),
            lastUpdated: Date.now(),
            lastAction: "Add Company"
        })
    });
exports.countOnCompanyDelete = functions
    .region(defaultRegion)
    .firestore.document('company/{docId}')
    .onDelete(async (snap, context) => {
        const docRef = firestore.doc('counts/companies');
        docRef.update({
            deleted: admin.firestore.FieldValue.increment(1),
            now: admin.firestore.FieldValue.increment(-1),
        });
        const listRef = firestore.collection('listOfIds').doc('companies')
        listRef.update({
            ids: admin.firestore.FieldValue.arrayRemove(context.params.docId),
            lastUpdated: Date.now(),
            lastAction: "Remove Company"
        })
    });

exports.onCreateWithdrawalRequest = functions
    .region(defaultRegion)
    .firestore.document('pointsConvertion/{docId}')
    .onCreate(async(snap, context) => {
        const requestId = await context.params.docId;
        firestore.doc(`pointsConvertion/${requestId}`).set({ id: requestId }, { merge: true });
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

function sliceIntoChunks(arr, chunkSize) {
    const res = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        res.push(chunk);
    }
    return res;
}

const runTaskSchedule = async () => {
    // get all campaigns data where hits > completedHits
    // suppose we have 5 campaign
    // const allRunningCampaigns = getRunnigCampaigns();
    // we need to check whether there is campaign available to run or not
    const referenceX = await campaignRef.where('status', '==', 'pending').get();
    if (referenceX.empty) {
        // console.log('No campaigns found')
        return JSON.stringify({ success: false, error: { message: 'No campaigns found' } });
    }

    // return referenceX.then(async (querySnapshot) => {
    //     console.log('line:408')
    //     console.log(querySnapshot);
    //     if (querySnapshot.length > 0) {
    return referenceX.forEach(async (doc) => {
        const docData = doc.data();
        if (docData.hits <= docData.completedhits) {
            campaignRef.doc(doc.id).set({ status: "complete" });
        } else {
            // console.log(doc.id, " => ", doc.data());
            let currentCampaign = docData;
            currentCampaign.id = doc.id;
            console.log('curretn campaign');
            console.log(currentCampaign);
            // allRunningCampaigns.forEach((currentCampaign) => {
            // starting to get non-completing tasks from current campaign
            // select from collection("campaigns).doc(currentCampaign.id).collection("tasks)
            // FIRST GET ALL ALLOTED TASKS LIST
            // .where allotedDate == yesterdayDateOnly OR allotedDate >= yesterdayDateOnly && isExpired == false
            var previousWeekDate = getPreviousWeekEpoch();
            const getCampaignSubmittedTasksRef = await campaignRef
                .doc(`${currentCampaign.id}/stats/alltasksStats`).get();
            if (getCampaignSubmittedTasksRef.exists) {
                var thisDoc = getCampaignSubmittedTasksRef.data();

                var totalSubmittedTasks = thisDoc.submittedTasks;
                var totalAllotedTasks = thisDoc.allotedTasks;
                var totalRejectedTasks = thisDoc.rejectedTasks;
                var totalApprovedTasks = thisDoc.approvedTasks;
                var totalExpiredTasks = thisDoc.expiredTasks

                var usersCompletedIds = thisDoc.allotedTasksUsers;

                thisDoc.allotedTasksUsers.forEach(async (user) => {
                    if (user.date > previousWeekDate) {
                        await campaignRef.doc(`${currentCampaign.id}/tasks/${user.taskid}`).set({ isExpired: true }, { merge: true });
                    }
                    usersCompletedIds.push(user.uid);
                });

                var neededToComplete = currentCampaign.hits - totalAllotedTasks; // suppose hits-1000 / completed-300 / need 700 / nc-600 / alloted-900
                // LIST OF USERS_ID"s WHERE THOSE TASKS ARE NOT ASSIGNED WITH LIMIT (suppose we need 200 users)
                // users list for exclude from the list =
                var newUserIds = [];

                // if (usersNotCompletedIds.length > 0 || usersCompletedIds.length > 0) {
                if (totalAllotedTasks > 0) {
                    // usersListX = [...usersNotCompletedIds, ...usersCompletedIds];
                    // console.log(usersListX);
                    const users1 = await usersRef
                        .where("uid", "not-in", usersCompletedIds)
                        .limit(neededToComplete)
                        .get();
                    // CHECK IF USERLIST HAVE ALL 200 USER OR NOT = suppose 500
                    if (!users1.empty) {
                        console.log('usersRef running')
                        users1.forEach((doc) => {
                            newUserIds.push({ id: doc.id, email: doc.data().email, name: doc.data().displayName });
                        });
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
                    }
                }

                // TASKS ALLOTING STARTED
                // allot tasks to user with push notification
                // console.log('batch 3')
                // const batch3 = firestore.batch();

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
                                userName: userData.name,
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

                            const batch = firestore.batch();
                            const taskRef = firestore.collection('campaign').doc(currentCampaign.id).collection("tasks").doc();
                            batch.set(taskRef, newTask);
                            batch.commit().then(() => {
                            }).catch((err) => {
                                console.log(err)
                            })
                        });
                    });
                    console.log('completedBatches');
                    // console.log(completedBatches);
                } else {
                    console.log('if (newUserIds.length < 499) ')
                    // console.log(newUserIds);
                    if (newUserIds.length > 0) {
                        newUserIds.forEach((userData, index) => {
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
                                userName: userData.name,
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

                            const batch = firestore.batch();
                            const taskRef = firestore.collection('campaign').doc(currentCampaign.id).collection("tasks").doc();
                            batch.set(taskRef, newTask);
                            batch.commit().then(() => {
                                const indexed = parseInt(newUserIds.length - 1)
                                if (index == indexed) {
                                    return JSON.stringify({ success: true, msg: 'total tasks alloted ' + newUserIds.length })
                                }
                            }).catch((err) => {
                                console.log(err)
                                return JSON.stringify({ success: false, msg: 'Error doing task allotment batches', error: err })
                            })
                        });
                    } else {
                        return JSON.stringify({ success: false, msg: 'No users found for the tasks allotment.' })
                    }
                }

            }

        }
    });
}
exports.assigningtasks = functions
    .region(defaultRegion)
    .https.onCall(async (data, context) => {
        const taskAllotment = await runTaskSchedule();
        // console.log('taskAllotment', taskAllotment);
        return taskAllotment;
    });

function getTodayEpoch() {
    var today = new Date();
    var todayDate = new Date(new Date(today.getFullYear(), today.getMonth(), today.getDate())).getTime();

    return todayDate;
}
function getPreviousWeekEpoch() {
    var today = new Date();
    var previousWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    var previousWeekDate = new Date(previousWeek).getTime();

    return previousWeekDate;
}

// tasks countings
exports.onCreateTaskSetId = functions
    .region(defaultRegion)
    .firestore.document('campaign/{campaignId}/tasks/{taskId}')
    .onCreate(async (snap, context) => {
        const campaignId = await context.params.campaignId;
        const taskId = await context.params.taskId;
        campaignRef.doc(`${campaignId}/tasks/${taskId}`).set({ id: taskId }, { merge: true });

        const userId = snap.data().uid;

        var userData = { date: getTodayEpoch(), uid: userId, taskid: taskId }
        const docRef = campaignRef.doc(`${campaignId}/stats/alltasksStats`)
        docRef.update({
            allotedTasks: admin.firestore.FieldValue.increment(1),
            allotedTasksUsers: admin.firestore.FieldValue.arrayUnion(userData),
            lastUpdated: Date.now(),
        });
    });

exports.onUpdateTaskCounting = functions
    .region(defaultRegion)
    .firestore.document('campaign/{campaignId}/tasks/{taskId}')
    .onUpdate(async (snap, context) => {
        const campaignId = context.params.campaignId;
        const taskId = context.params.taskId;

        const newData = snap.after.data();
        const previousData = snap.before.data();

        const userId = newData.uid;
        const taskPlatform = newData.platform;
        const taskPlatformItem = newData.platformTask;
        const pointsToGive = newData.pointPerTask;

        const alltasksStatsRef = campaignRef.doc(`${campaignId}/stats/alltasksStats`);
        const alltasksStatsData = await alltasksStatsRef.get();
        const userData = { date: getTodayEpoch(), uid: userId, taskid: taskId }
        if (alltasksStatsData.exists) {
            if (newData.isSubmitted !== previousData.isSubmitted && newData.isSubmitted == true) {
                alltasksStatsRef.update({
                    submittedTasks: admin.firestore.FieldValue.increment(1),
                    submittedTasksUsers: admin.firestore.FieldValue.arrayUnion(userData),
                    lastUpdated: Date.now(),
                });
            }
            if (newData.isApproved !== previousData.isApproved && newData.isApproved == true) {
                const userDataToRemoveFromSubmitted = alltasksStatsData.submittedTasksUsers.forEach((data) => {
                    return data.uid == userId;
                });
                alltasksStatsRef.update({
                    // remove & decrement from submitted
                    submittedTasks: admin.firestore.FieldValue.increment(-1),
                    submittedTasksUsers: admin.firestore.FieldValue.arrayRemove(userDataToRemoveFromSubmitted[0]),
                    approvedTasks: admin.firestore.FieldValue.increment(1),
                    approvedTasksUsers: admin.firestore.FieldValue.arrayUnion(userData),
                    lastUpdated: Date.now(),
                });
                pointsRef
                    .add({
                        points: pointsToGive,
                        referedUserName: '',
                        referedUserUid: '',
                        type: "task",
                        uid: userId,
                        taskId: taskId,
                        taskPlatform: taskPlatform,
                        taskPlatformItem: taskPlatformItem,
                        dateCreated: Date.now(),
                    })
                    .then(() => {
                        firestore.doc(`pointsWallet/${userId}`).update({
                            currentPoints: admin.firestore.FieldValue.increment(pointsToGive),
                            totalPoints: admin.firestore.FieldValue.increment(pointsToGive),
                        }).then(() => {
                            // console.log('main user wallet updated');
                            firestore.doc(`users/${userId}`).update({
                                totalCompletedTasks: admin.firestore.FieldValue.increment(1)
                            }).then(() => {
                                // console.log('main user profile updated');
                            }).catch((err) => {
                                console.log(err);
                            })
                        }).catch((err) => {
                            console.log(err);
                        })
                    });
            }
            if (newData.isRejected !== previousData.isRejected && newData.isRejected == true) {
                const userDataToRemoveFromSubmitted = alltasksStatsData.submittedTasksUsers.forEach((data) => {
                    return data.uid == userId;
                });
                alltasksStatsRef.update({
                    // remove & decrement from submitted
                    submittedTasks: admin.firestore.FieldValue.increment(-1),
                    submittedTasksUsers: admin.firestore.FieldValue.arrayRemove(userDataToRemoveFromSubmitted[0]),
                    isRejected: admin.firestore.FieldValue.increment(1),
                    rejectedTasksUsers: admin.firestore.FieldValue.arrayUnion(userData),
                    lastUpdated: Date.now(),
                });
            }
            if (newData.isExpired !== previousData.isExpired && newData.isExpired == true) {
                const userDataToRemoveFromAlloted = alltasksStatsData.allotedTasksUsers.forEach((data) => {
                    return data.uid == userId;
                });
                alltasksStatsRef.update({
                    // remove & decrement from alloted
                    allotedTasks: admin.firestore.FieldValue.increment(-1),
                    allotedTasksUsers: admin.firestore.FieldValue.arrayRemove(userDataToRemoveFromAlloted[0]),
                    isExpired: admin.firestore.FieldValue.increment(1),
                    expiredTasksUsers: admin.firestore.FieldValue.arrayUnion(userData),
                    lastUpdated: Date.now(),
                });
            }
        }


    });