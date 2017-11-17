const sessionsManager = require('../../../sessionsManager')
var firebase = require("firebase-admin");
const winston = require('winston');
const moment = require('moment');

const CONTEXTS_DB_NAME = "Contexts" //saves API.AI respones by Session
const FB_USERS_DB_NAME = "FB_Users"
const AUTOMATIC_DB_NAME = "Automatic";
const NOTIFICATIONS_DB_NAME = "Notifications"

const ESSENTAIALS_USERS_DB_NAME = process.env.DEALERSHIP_BOT ? "Essentials_users" : "users"
const WORKPLACE_USERS_DB_NAME = process.env.DEALERSHIP_BOT ? "Workplace_users" : 'community'

class Firebase {

    constructor() {
        var privateKey = null
        try {
            privateKey = JSON.parse(process.env.FIREBASE_ADMIN_PRIVATE_KEY)
        } catch (e) {
            privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
        }

        firebase.initializeApp({
            credential: firebase.credential.cert({
                "private_key": privateKey,
                "client_email": process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            }),
            databaseURL: process.env.FIREBASE_DB
        }
        );
        this.db = firebase.database();
    }

    getEssentialsUser(fbID, logout = false) {
        let self = this
        return new Promise(function (fulfill, reject) {
            var usersRef = self.db.ref(ESSENTAIALS_USERS_DB_NAME).child(fbID)
                .once('value')
                .then(function (snapshot) {
                    var value = snapshot.val();
                    if (value) {
                        var foundUser = value.oauthUser
                        //check the expiration
                        var expires_in = foundUser.expires_in;

                        var refresh_token = foundUser.refresh_token;
                        var token_created_date = value.token_created_date
                        var now = moment();
                        var token_expiration_date = moment(token_created_date);
                        //check if expiration 60ms BEFORE its expiring
                        //calling refresh_token grant fails when token is already expired
                        token_expiration_date.add(expires_in - 60, "seconds")
                        if (logout) {
                            fulfill(value);
                            return
                        }
                        var difference = moment.duration(now.diff(token_expiration_date));

                        if (difference.asMilliseconds() > 1) {
                            winston.error('access token expiring soon...');
                            var error = new Error("access token expired")
                            error.code = "ACCESS_TOKEN_ERROR"
                            var result = {
                                error: error,
                                user: value
                            }

                            reject(result)
                        } else {
                            winston.info('Retrived value user from FB', foundUser);
                            fulfill(value);
                        }

                    } else {
                        reject(new Error("User Not found"))
                    }
                });
        });
    }

    getUserByEvent(data) {
        let self = this
        return new Promise(function (fulfill, reject) {

            var ref = self.db.ref();

            ref.child(ESSENTAIALS_USERS_DB_NAME).once('value', function (snap) {
                var value = snap.val();
                if (value) {
                    var foundUser;
                    for (var i = 0; i < Object.keys(value).length; i++) {
                        var keyName = Object.keys(value)[i]
                        var user = value[keyName]

                        var eventExtension = data.local.extension;
                        var eventAccountID = data.accountNumber

                        var foundUser = null
                        var accountID = user.settings.basicInfo.accountId

                        if (typeof user.settings.extensions[0] != 'undefined') {
                            var extensions = user.settings.extensions[0]
                            var extension = extensions.extension;


                            if (accountID == eventAccountID && extension == eventExtension) {
                                foundUser = user
                                break;
                            }
                        }
                    }

                    if (foundUser) {
                        fulfill(foundUser)
                        return
                    }
                }
                reject(new Error("User Not found"))

            });
        });



        return new Promise(function (fulfill, reject) {
            var usersRef = self.db.ref().child(ESSENTAIALS_USERS_DB_NAME)
            usersRef.orderByChild('account_id').equalTo(accountID).on("value", function (snapshot) {
                snapshot.forEach(function (data) {

                });
            });
        });

    }

    getUser(userID) {
        let self = this
        return new Promise(function (resolve, reject) {
            var ref = self.db.ref(FB_USERS_DB_NAME);
            ref.child(userID)
                .once('value')
                .then(function (snapshot) {
                    var value = snapshot.val();
                    if (value) {
                        resolve(value)
                    } else {
                        console.error("User Not found")
                        resolve(null)
                    }
                });
        });
    }

    updateUser(tokenData) {
        let self = this
        var fbID = tokenData.senderID;
        return new Promise(function (fulfill, reject) {
            var usersRef = self.db.ref(ESSENTAIALS_USERS_DB_NAME).child(fbID)
                .once('value')
                .then(function (snapshot) {
                    var value = snapshot.val();
                    if (value) {
                        var foundUser = value;
                        var ref = self.db.ref(ESSENTAIALS_USERS_DB_NAME).child(fbID)
                        tokenData.token_created_date = new Date().toISOString()

                        ref.update(tokenData)
                        ref.once('value', function (snapshot) {
                            // winston.info('User Data updated successfully with data', data);
                            fulfill(snapshot.val())
                        });

                    } else {
                        tokenData.token_created_date = new Date().toISOString()
                        self.db.ref(ESSENTAIALS_USERS_DB_NAME).child(fbID).set(tokenData);
                        fulfill(tokenData)
                    }
                });
        })
    }

    removeUser(fbID) {
        let self = this
        return new Promise(function (fulfill, reject) {
            var usersRef = self.db.ref(ESSENTAIALS_USERS_DB_NAME).child(fbID)
            usersRef.on('child_removed', function (snapshot) {
                winston.info('user removed');
                fulfill()
            })
            usersRef.remove()
        });
    }

    updateFBUsers(communityID, users) {
        let self = this
        return new Promise(function (fulfill, reject) {
            var usersRef = self.db.ref(WORKPLACE_USERS_DB_NAME).child(communityID)
                .once('value')
                .then(function (snapshot) {
                    var value = snapshot.val();
                    if (value) {
                        var foundUser = value;
                        var ref = self.db.ref(WORKPLACE_USERS_DB_NAME).child(communityID)

                        ref.set(users)
                        ref.once('value', function (snapshot) {
                            winston.info('User Data updated successfully with users');
                            fulfill(snapshot.val())
                        });

                    } else {
                        self.db.ref(WORKPLACE_USERS_DB_NAME).child(communityID).set(users);
                        fulfill(users)
                    }
                });
        })
    }

    allFBUsers() {
        let self = this
        return new Promise(function (fulfill, reject) {
            self.db.ref(FB_USERS_DB_NAME + "/")
                .once('value')
                .then(function (snapshot) {
                    var value = snapshot.val();
                    if (value) {
                        var users = snapshot.val()
                        fulfill(users)
                    } else {
                        reject(new Error("No users"))
                    }
                });
        })
    }

    allFBCommunityUsers(communityID) {
        let self = this
        return new Promise(function (fulfill, reject) {
            var usersRef = self.db.ref(WORKPLACE_USERS_DB_NAME).child(communityID)
                .once('value')
                .then(function (snapshot) {
                    var value = snapshot.val();
                    if (value) {
                        var users = snapshot.val()
                        fulfill(users)
                    } else {
                        reject(new Error("No users"))
                    }
                });
        })
    }

    allAutomaticUsers() {
        let self = this
        return new Promise(function (fulfill, reject) {
            self.db.ref(AUTOMATIC_DB_NAME + "/")
                .once('value')
                .then(function (snapshot) {
                    var value = snapshot.val();
                    if (value) {
                        var users = snapshot.val()
                        fulfill(users)
                    } else {
                        reject(new Error("No users"))
                    }
                });
        })
    }

    getFBUser(userId) {
        let self = this
        return new Promise(function (fulfill, reject) {
            self.db.ref(FB_USERS_DB_NAME + "/" + userId)
                .once('value')
                .then(function (snapshot) {
                    var value = snapshot.val();
                    if (value) {
                        var user = snapshot.val()
                        fulfill(user)
                    } else {
                        fulfill(null)
                    }
                });
        });
    }

    allEssentialsUsers() {
        let self = this
        return new Promise(function (fulfill, reject) {
            self.db.ref(ESSENTAIALS_USERS_DB_NAME + "/")
                .once('value')
                .then(function (snapshot) {
                    var value = snapshot.val();
                    if (value) {
                        var users = snapshot.val()
                        fulfill(users)
                    } else {
                        reject(new Error("No users"))
                    }
                });
        })
    }

    saveNotification(fbID, data) {
        let self = this
        return new Promise(function (fulfill, reject) {
            var usersRef = self.db.ref(NOTIFICATIONS_DB_NAME).child(fbID).child(data.callId)
                .set(data)
                .then(function () {
                    fulfill()
                });
        })
    }
    getNotification(fbID) {
        let self = this
        return new Promise(function (fulfill, reject) {
            var usersRef = self.db.ref(NOTIFICATIONS_DB_NAME).child(fbID)
            .limitToLast(1)
            .on("value", function (snapshot) {
                var value = snapshot.val();
                Object.keys(value).forEach(function (key) {
                    fulfill(value[key])
                })
                    
                
            })
        })
    }
    /**
     * Used to return the user info from a customer asking about Car info
     * Board Demo
     */
    getCustomerWithPhone(phoneNumber) {
        let self = this
        return new Promise(function (fulfill, reject) {
            getClientUser(phoneNumber)
                .then(function (user) {
                    winston.info("got user", user)
                    return getSession(user)
                }).then(function (data) {
                    fulfill(data);
                }).catch(function (err) {
                    winston.error(err)
                    reject(err)
                })
        })
    }

    getClientUser(phoneNumber) {
        let self = this
        return new Promise(function (fulfill, reject) {
            self.db.ref(FB_USERS_DB_NAME)
                .once("value", function (snapshot) {
                    var value = snapshot.val();
                    snapshot.forEach(function (snap) {
                        var user = snap.val()
                        if (typeof user.phoneNumbers != 'undefined') {
                            Object.keys(user.phoneNumbers).forEach(function (key) {
                                var _phoneNumber = user.phoneNumbers[key]
                                if (_phoneNumber == phoneNumber) {
                                    fulfill(user)
                                    return true
                                }
                            });
                        }

                    });
                    reject(new Error("User not found with phone number " + phoneNumber))
                });
        });
    }

    getSession(user) {
        let self = this
        const CAR_TYPE_CONTEXT = "car-type"
        return new Promise(function (fulfill, reject) {
            self.db.ref(CONTEXTS_DB_NAME).child(user.contexts[CAR_TYPE_CONTEXT])
                .on("value", function (snapshot) {
                    var value = snapshot.val();
                    fulfill({ user: user, session: value })
                    return
                })

        });
    }
}

var firebase = new Firebase()
sessionsManager.initializeDb(firebase)
module.exports = firebase