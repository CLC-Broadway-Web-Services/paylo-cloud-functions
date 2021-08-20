
// const getRandomNumber = () => {
//   const string = "PL";
//   return string + Date.now().toString().substring(0, 10);
// }



// exports.onUserEmailVerify = functions
//     .region(defaultRegion).https.onCall((data, context) => {
//         const userId = data.userId;
//         firestore
//             .doc(`users/${userId}`)
//             .get()
//             .then((user) => {
//                 const verifiedUser = user.data();
//                 //   const verifiedUserId = user.id;
//                 const inviteCodeX = verifiedUser.myInviteCode;

//                 inviteCodesRef
//                     .where("code", "==", inviteCodeX)
//                     .get()
//                     .then((inviteCode) => {
//                         const codes = [];
//                         inviteCode.forEach((sCode) => {
//                             const code = sCode.data();
//                             code.id = sCode.id;
//                             codes.push(code);
//                         });
//                         if (codes && codes.length > 0) {
//                             const currentCode = codes[0];
//                             const referedUser = currentCode.uid;
//                             const referedUserDisplayName = currentCode.uid;

//                             firestore
//                                 .doc(`users/${referedUser}`)
//                                 .get()
//                                 .then((refUser) => {
//                                     const refUserData = refUser.data();
//                                     const totalReferrals = refUserData.totalReferrals;
//                                     let pointsToGive = 5;
//                                     if (totalReferrals || totalReferrals != 0) {
//                                         if (totalReferrals >= 10) {
//                                             pointsToGive = 3;
//                                         }
//                                         if (totalReferrals >= 20) {
//                                             pointsToGive = 2;
//                                         }
//                                     }
//                                     pointsRef
//                                         .add({
//                                             points: pointsToGive,
//                                             referedUserName: referedUserDisplayName,
//                                             referedUserUid: referedUser,
//                                             type: "refer",
//                                             uid: user.uid,
//                                             taskId: "",
//                                             taskPlatform: "",
//                                             taskPlatformItem: "",
//                                             dateCreated: Date.now(),
//                                         })
//                                         .then(() => {
//                                             const washingtonRef = firestore
//                                                 .collection("pointsWallet")
//                                                 .doc(referedUser);
//                                             washingtonRef.update({
//                                                 currentPoints:
//                                                     admin.firestore.FieldValue.increment(pointsToGive),
//                                                 totalPoints:
//                                                     admin.firestore.FieldValue.increment(pointsToGive),
//                                             });
//                                         });
//                                 });
//                         }
//                     });
//             });
//     });












// exports.onUserRegister = functions
//     .region(defaultRegion).auth.user().onCreate((user) => {
//         setTimeout(() => {
//             firestore
//                 .doc(`users/${user.uid}`)
//                 .get()
//                 .then((data) => {
//                     const thisData = data.data();
//                     const inviteCodeX = data.data().inviteCode;
//                     inviteCodesRef.add({
//                         uid: user.uid,
//                         code: thisData.shareCode,
//                         name: thisData.displayName,
//                     });
//                     let clm;
//                     if (thisData.claim == 'user') {
//                         clm = { user: true };
//                     }
//                     if (thisData.claim == 'executive') {
//                         clm = { executive: true };
//                     }
//                     if (thisData.claim == 'admin') {
//                         clm = { admin: true };
//                     }
//                     admin
//                         .auth()
//                         .setCustomUserClaims(user.uid, clm)
//                         .then((result) => {
//                             inviteCodesRef
//                                 .where("code", "==", inviteCodeX)
//                                 .get()
//                                 .then((inviteCode) => {
//                                     const codes = [];
//                                     inviteCode.forEach((sCode) => {
//                                         let code = sCode.data();
//                                         code.id = sCode.id;
//                                         codes.push(code);
//                                     });
//                                     if (codes && codes.length > 0) {
//                                         pointsWalletRef.doc(user.uid).set({
//                                             currentPoints: 0,
//                                             totalPoints: 0,
//                                             totalConvertedPoints: 0,
//                                             convertionRateInitial: 1,
//                                             totalConvertedAmount: 0,
//                                             withdrawlAmount: 0,
//                                             userUpi: "",
//                                             uid: user.uid,
//                                             id: user.uid,
//                                         });
//                                     }
//                                 });
//                         });
//                 });
//         }, 3000);
//     });










// exports.onCreateUserDocument = functions
//     .region(defaultRegion).auth.user().onCreate((user) => {
//         setTimeout(() => {
//             const userId = user.uid;
//             firestore.doc(`users/${userId}`).get().then((data) => {
//                 const thisData = data.data();
//                 inviteCodesRef.doc(userId).set({
//                     uid: userId,
//                     code: thisData.myInviteCode,
//                     name: user.displayName,
//                 });
//                 if (thisData.claim == 'user') {
//                     admin
//                         .auth()
//                         .setCustomUserClaims(userId, { user: true })
//                         .then((result) => {
//                         });
//                 }
//                 if (thisData.claim == 'executive') {
//                     admin
//                         .auth()
//                         .setCustomUserClaims(userId, { executive: true })
//                         .then((result) => {
//                         });
//                 }
//                 if (thisData.claim == 'admin') {
//                     admin
//                         .auth()
//                         .setCustomUserClaims(userId, { admin: true })
//                         .then((result) => {
//                         });
//                 }
//             })
//         }, 3000);
//     })







// auth.user().onCreate
// .firestore.document('/users/{uid}')
// trigger when user verify his/her email then login to app
// exports.afterConfirmedEmail = functions
//     .region(defaultRegion)
//     .firestore.document('users/{userId}')
//     .onUpdate((change, context) => {

//         const data = change.after.data();
//         const previousData = change.before.data();

//         if (data.emailVerified !== previousData.emailVerified) {
//             const userId = data.uid;
//             firestore
//                 .doc(`users/${userId}`)
//                 .get()
//                 .then((user) => {
//                     const verifiedUser = user.data();
//                     //   const verifiedUserId = user.id;
//                     const inviteCodeX = verifiedUser.myInviteCode;

//                     inviteCodesRef
//                         .where("code", "==", inviteCodeX)
//                         .get()
//                         .then((inviteCode) => {
//                             const codes = [];
//                             inviteCode.forEach((sCode) => {
//                                 const code = sCode.data();
//                                 code.id = sCode.id;
//                                 codes.push(code);
//                             });
//                             if (codes && codes.length > 0) {
//                                 const currentCode = codes[0];
//                                 const mainUser = currentCode.uid;
//                                 const mainUserDisplayName = currentCode.name;

//                                 firestore
//                                     .doc(`users/${mainUser}`)
//                                     .get()
//                                     .then((refUser) => {
//                                         const refUserData = refUser.data();
//                                         const totalReferrals = refUserData.totalReferrals;
//                                         let pointsToGive = 5;
//                                         if (totalReferrals && totalReferrals > 0) {
//                                             if (totalReferrals >= 10) {
//                                                 pointsToGive = 3;
//                                             }
//                                             if (totalReferrals >= 20) {
//                                                 pointsToGive = 2;
//                                             }
//                                         }
//                                         pointsRef
//                                             .add({
//                                                 points: pointsToGive,
//                                                 referedUserName: mainUserDisplayName,
//                                                 referedUserUid: mainUser,
//                                                 type: "refer",
//                                                 uid: user.id,
//                                                 taskId: "",
//                                                 taskPlatform: "",
//                                                 taskPlatformItem: "",
//                                                 dateCreated: Date.now(),
//                                             })
//                                             .then(() => {
//                                                 firestore.doc(`pointsWallet/${mainUser}`).update({
//                                                     currentPoints: admin.firestore.FieldValue.increment(pointsToGive),
//                                                     totalPoints: admin.firestore.FieldValue.increment(pointsToGive),
//                                                 });
//                                             });
//                                     });
//                             }
//                         });
//                 });
//             return null;
//         } else {
//             return null;
//         }
//     });












// auth.user().onCreate
// .firestore.document('/users/{uid}')
// trigger when user verify his/her email then login to app
// exports.afterConfirmedEmail = functions
//     .region(defaultRegion)
//     .firestore.document('users/{userId}')
//     .onUpdate((change, context) => {

//         const data = change.after.data();
//         const previousData = change.before.data();

//         if (data.emailVerified != previousData.emailVerified) {
//             const userIdForCurrentUser = data.uid;
//             firestore
//                 .doc(`users/${userIdForCurrentUser}`)
//                 .get()
//                 .then((user) => {
//                     const verifiedUser = user.data();
//                     //   const verifiedUserId = user.id;
//                     const inviteCodeX = verifiedUser.inviteCode;

//                     inviteCodesRef
//                         .where("code", "==", inviteCodeX)
//                         .get()
//                         .then((inviteCode) => {
//                             const codes = [];
//                             inviteCode.forEach((sCode) => {
//                                 const code = sCode.data();
//                                 code.id = sCode.id;
//                                 codes.push(code);
//                             });
//                             if (codes && codes.length > 0) {
//                                 const currentCode = codes[0];
//                                 const mainUser = currentCode.uid;
//                                 const mainUserDisplayName = currentCode.name;

//                                 firestore
//                                     .doc(`users/${mainUser}`)
//                                     .get()
//                                     .then((refUser) => {
//                                         const refUserData = refUser.data();
//                                         const totalReferrals = refUserData.totalReferrals;
//                                         let pointsToGive = 5;
//                                         if (totalReferrals && totalReferrals > 0) {
//                                             if (totalReferrals >= 10) {
//                                                 pointsToGive = 3;
//                                             }
//                                             if (totalReferrals >= 20) {
//                                                 pointsToGive = 2;
//                                             }
//                                         }
//                                         pointsRef
//                                             .add({
//                                                 points: pointsToGive,
//                                                 referedUserName: mainUserDisplayName,
//                                                 referedUserUid: mainUser,
//                                                 type: "refer",
//                                                 uid: user.id,
//                                                 taskId: "",
//                                                 taskPlatform: "",
//                                                 taskPlatformItem: "",
//                                                 dateCreated: Date.now(),
//                                             })
//                                             .then(() => {
//                                                 firestore.doc(`pointsWallet/${mainUser}`).update({
//                                                     currentPoints: admin.firestore.FieldValue.increment(pointsToGive),
//                                                     totalPoints: admin.firestore.FieldValue.increment(pointsToGive),
//                                                 });
//                                                 firestore.doc(`users/${mainUser}`).update({
//                                                     totalReferrals: admin.firestore.FieldValue.increment(1)
//                                                 });
//                                             });
//                                     });
//                             }
//                         });
//                 });
//             return {success:true};
//         } else {
//             return null;
//         }
//     });
