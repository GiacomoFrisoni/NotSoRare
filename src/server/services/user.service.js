// Modules for managing queries and transactions on sql server database
const Request = require('tedious').Request;
const TYPES = require('tedious').TYPES;
const ISOLATION_LEVEL = require('tedious').ISOLATION_LEVEL;

// Request for connection to the relational database
const sql = require('../sql');

// Module for tedious query result handling
const queryResultHandler = require('../utilities/tedious_query_result_util');

// Mongoose model for an user
const User = require('../models/user.model');


function getUsersStats(req, res) {

    // Gets the total number of users
    globalCountRequest = new Request("SELECT COUNT(*) FROM StandardUser;", (queryError, rowCount, rows) => {
        if (queryError) {
            res.status(500).send({
                errorMessage: req.i18n.__("Err_Users_GlobalCount", queryError)
            });
        } else {
            // The select operation concerns a single row
            if (rowCount == 0) {
                res.status(500).send({
                    errorMessage: req.i18n.__("Err_Users_GlobalCount")
                });
            } else {

                // Checks for a invalid counter value
                if (rows[0][0].value === null) {
                    res.status(500).send({
                        errorMessage: req.i18n.__("Err_Users_GlobalCount")
                    });
                } else {

                    const nTotalUsers = rows[0][0].value;

                    // Gets the number of users for each country
                    countryCountRequest = new Request("SELECT Nationality AS country, COUNT(*) AS countryUsers FROM StandardUser GROUP BY Nationality;", (queryError, rowCount, rows) => {
                        if (queryError) {
                            res.status(500).send({
                                errorMessage: req.i18n.__("Err_Users_CountryCount", queryError)
                            });
                        } else {
                            
                            var usersStats = [];
                            usersStats.push({ totalUsers: nTotalUsers });

                            // Parses the data from each of the row and populate the user statistics json array
                            var countryObject = {};
                            queryResultHandler.addArraySectionToJSONFromRows("countries", rowCount, rows, countryObject, null, true, () => {
                                return res.status(500).send({
                                    errorMessage: req.i18n.__("Err_Users_CountryCount", "Invalid data")
                                });
                            });
                            usersStats.push(countryObject);
                            
                            res.status(200).json(usersStats);

                        }
                    });

                    // Performs the country user counter retrieving on the relational database
                    sql.connection.execSql(countryCountRequest);
                }

            }
        }
    });

    // Performs the global user counter retrieving on the relational database
    sql.connection.execSql(globalCountRequest);

}


function getUser(req, res) {

    const id = parseInt(req.params.id, 10);

    /**
     * Prepares the SQL statement with parameters for SQL-injection avoidance,
     * in order to check if the requested user is anonymous or not.
     */
    checkAnonymousRequest = new Request(
        "SELECT IsAnonymous FROM StandardUser WHERE CodUser = @CodUser;", (queryError, rowCount, rows) => {
            if (queryError) {
                res.status(500).send({
                    errorMessage: req.i18n.__("Err_Users_UserInfo", queryError)
                });
            } else {
                /**
                 * The operation concerns a single row.
                 * If zero rows are affected, it means that there is no registered user with the specified code.
                 */
                if (rowCount == 0) {
                    res.status(404).send({
                        errorMessage: req.i18n.__("Err_Users_UserNotFound")
                    });
                } else {

                    // If the user has an anonymous profile and does not match with the logged one...
                    const isAnonymous = rows[0][0].value;
                    if (isAnonymous && req.session.user != id) {
                        /**
                         * Prepares the SQL statement with parameters for SQL-injection avoidance,
                         * in order to select only some basic information of the anonymous user.
                         */
                        anonymousUserRequest = new Request(
                            "SELECT IsAnonymous, RegistrationDate, PatientYN, " +
                            "(SELECT COUNT(*) FROM Interest WHERE CodUser = @CodUser) AS RareDiseasesCount, " +
                            "(SELECT COUNT(*) FROM Experience WHERE CodUser = @CodUser) AS ExperiencesCount " +
                            "FROM StandardUser WHERE CodUser = @CodUser;", (queryError, rowCount, rows) => {
                                if (queryError) {
                                    res.status(500).send({
                                        errorMessage: req.i18n.__("Err_Users_UserInfo", queryError)
                                    });
                                } else {
                                    // Parses the data from each of the row and populate the user statistics json array
                                    const userInfo = queryResultHandler.getJSONFromRow(rows[0]);
                                    
                                    res.status(200).json(userInfo);
                                }
                            }
                        );
                        anonymousUserRequest.addParameter('CodUser', TYPES.Numeric, id);

                        // Performs the anonymous profile getter query on the relational database
                        sql.connection.execSql(anonymousUserRequest);
                    } else {
                        /**
                         * Prepares the SQL statement with parameters for SQL-injection avoidance,
                         * in order to obtain the registered user data.
                         */
                        userRequest = new Request(
                            "SELECT IsAnonymous, Email, Surname, Name, Gender, BirthDate, Nationality, Photo, Biography, " +
                            "RegistrationDate, PatientYN, PatientName, PatientSurname, PatientGender, PatientBirthDate, PatientNationality, " +
                            "(SELECT COUNT(*) FROM Interest WHERE CodUser = @CodUser) AS RareDiseasesCount, " +
                            "(SELECT COUNT(*) FROM Experience WHERE CodUser = @CodUser) AS ExperiencesCount " +
                            "FROM StandardUser WHERE CodUser = @CodUser;", (queryError, rowCount, rows) => {
                                if (queryError) {
                                    res.status(500).send({
                                        errorMessage: req.i18n.__("Err_Users_UserInfo", queryError)
                                    });
                                } else {
                                    // Parses the data from each of the row and populate the user statistics json array
                                    const userInfo = queryResultHandler.getJSONFromRow(rows[0]);
                                    
                                    res.status(200).json(userInfo);
                                }
                            }
                        );
                        userRequest.addParameter('CodUser', TYPES.Numeric, id);

                        // Performs the info selection query on the relational database
                        sql.connection.execSql(userRequest);
                    }

                }
            }
        }
    );
    checkAnonymousRequest.addParameter('CodUser', TYPES.Numeric, id);

    // Performs the anonymous check query on the relational database
    sql.connection.execSql(checkAnonymousRequest);

}


function putUser(req, res) {
    
    const id = parseInt(req.params.id, 10);

    /**
     * Only a logged user with the same code of the request can update the data.
     */
    if (req.session.user == id) {

        /**
         * Handles a transaction in order to rollback from sql update if the mongo one fails
         * or another error occurres.
         */
        sql.connection.transaction((error, done) => {
            if (error) {
                res.status(500).send({
                    errorMessage: req.i18n.__("Err_Users_BeginUpdateTransaction", error)
                });
            } else {
                /**
                 * Prepares the SQL statement with parameters for SQL-injection avoidance,
                 * in order to update the registered user account.
                 */
                updateRequest = new Request(
                    "UPDATE StandardUser " +
                    "SET Email = @Email, Name = @Name, Surname = @Surname, Gender = @Gender, BirthDate = @BirthDate, Nationality = @Nationality, IsAnonymous = @IsAnonymous, Photo = " + ((req.body.photoContentType && req.body.photoData) ? "@Photo" : "NULL") + ", Biography = " + (req.body.biography ? "@Biography" : "NULL") + " " +
                    "WHERE CodUser = @CodUser;", (queryError, rowCount) => {
                        if (queryError) {
                            res.status(500).send({
                                errorMessage: req.i18n.__("Err_Users_UserUpdate", queryError)
                            });
                        } else {

                            /**
                             * The operation concerns a single row.
                             * If zero rows are affected, it means that there is no user with the specified id code.
                             */
                            if (rowCount == 0) {
                                done(null, () => {
                                    res.status(404).send({
                                        errorMessage: req.i18n.__("Err_Users_UserNotFound")
                                    });
                                });
                            } else {
                                /**
                                 * The update on relational database was successful.
                                 * Now updates data on mongo database.
                                 */
                                var updatedUser = {
                                    first_name: req.body.name,
                                    last_name: req.body.surname,
                                    gender: req.body.gender,
                                    birth_date: req.body.birthDate,
                                    is_anonymous: req.body.isAnonymous
                                };
                                if (req.body.photoContentType && req.body.photoData) {
                                    // Converts base64 photo encoding into buffer
                                    updatedUser.photoContentType = req.body.photoContentType;
                                    updatedUser.photoData = Buffer.from(req.body.photoData, "base64");
                                }
                                User.findOne({ code: id }, (error, user) => {
                                    // Checks server error
                                    if (error) {
                                        // Rollback the sql update if the mongo one fails
                                        done(error, () => {
                                            res.status(500).send({
                                                errorMessage: req.i18n.__("Err_Users_UserUpdate", error)
                                            });
                                        });
                                    } else {
                                        // Checks that the user has been found
                                        if (!user) {
                                            // Rollback the sql update
                                            done(error, () => {
                                                res.status(404).send({
                                                    errorMessage: req.i18n.__("Err_Users_UserNotFound", error)
                                                });
                                            });
                                        } else {
                                            user.first_name = updatedUser.first_name;
                                            user.last_name = updatedUser.last_name;
                                            user.gender = updatedUser.gender;
                                            user.birth_date = updatedUser.birth_date;
                                            user.is_anonymous = updatedUser.is_anonymous;
                                            if (req.body.photoContentType && req.body.photoData) {
                                                user.photo.contentType = updatedUser.photoContentType;
                                                user.photo.data = updatedUser.photoData;
                                            }
                                            user.save(error => {
                                                if (error) {
                                                    // Rollback the sql update if the mongo one fails
                                                    done(error, () => {
                                                        res.status(500).send({
                                                            errorMessage: req.i18n.__("Err_Users_UserUpdate", error)
                                                        });
                                                    });
                                                } else {
                                                    // Commit the transaction
                                                    done(null, () => {
                                                        res.status(200).send({
                                                            infoMessage: req.i18n.__("UserUpdate_Completed")
                                                        });
                                                    });
                                                }
                                            });
                                        }
                                    }
                                })
                            }

                        }
                    }
                );
                updateRequest.addParameter('Email', TYPES.NVarChar, req.body.email);
                updateRequest.addParameter('Name', TYPES.NVarChar, req.body.name);
                updateRequest.addParameter('Surname', TYPES.NVarChar, req.body.surname);
                updateRequest.addParameter('Gender', TYPES.Char, req.body.gender);
                updateRequest.addParameter('BirthDate', TYPES.Date, req.body.birthDate);
                updateRequest.addParameter('Nationality', TYPES.NVarChar, req.body.nationality);
                updateRequest.addParameter('IsAnonymous', TYPES.Bit, req.body.isAnonymous);
                if (req.body.photoContentType && req.body.photoData) {
                    const url = "data:" + req.body.photoContentType + ";base64," + req.body.photoData.toString('base64');
                    updateRequest.addParameter('Photo', TYPES.NVarChar, url);
                }
                if (req.body.biography) {
                    updateRequest.addParameter('Biography', TYPES.NVarChar, req.body.biography);
                }
                updateRequest.addParameter('CodUser', TYPES.Numeric, id);

                // Performs the update query on the relational database
                sql.connection.execSql(updateRequest);
            }
        }, "USER_UPDATE_TRANSACTION", ISOLATION_LEVEL.SNAPSHOT);

    } else {
        res.status(401).send({
            errorMessage: req.i18n.__("Err_UnauthorizedUser")
        });
    }
    
}


function deleteUser(req, res) {

    const id = parseInt(req.params.id, 10);

    /**
     * Only a logged user with the same code of the request can delete the data.
     */
    if (req.session.user == id) {

        /**
         * Handles a transaction in order to rollback from sql delete if the mongo one fails
         * or another error occurres.
         */
        sql.connection.transaction((error, done) => {
            if (error) {
                res.status(500).send({
                    errorMessage: req.i18n.__("Err_Users_BeginDeleteTransaction", error)
                });
            } else {
                /**
                 * Prepares the SQL statement with parameters for SQL-injection avoidance,
                 * in order to delete the registered user account.
                 */
                deletionRequest = new Request(
                    "DELETE FROM StandardUser WHERE CodUser = @CodUser;", (queryError, rowCount) => {
                        if (queryError) {
                            res.status(500).send({
                                errorMessage: req.i18n.__("Err_Users_UserDeletion", queryError)
                            });
                        } else {

                            /**
                             * The operation concerns a single row.
                             * If zero rows are affected, it means that there is no user with the specified id code.
                             */
                            if (rowCount == 0) {
                                done(null, () => {
                                    res.status(404).send({
                                        errorMessage: req.i18n.__("Err_Users_UserNotFound")
                                    });
                                });
                            } else {
                                /**
                                 * The deletion on relational database was successful.
                                 * Now deletes data on mongo database.
                                 */
                                User.findOneAndRemove({ code: id })
                                    .then(user => {
                                        // Checks that the user has been found
                                        if (!user) {
                                            // Rollback the sql update
                                            done(new Error(), () => {
                                                res.status(404).send({
                                                    errorMessage: req.i18n.__("Err_Users_UserNotFound", error)
                                                });
                                            });
                                        } else {
                                            // Commit the transaction
                                            done(null, () => {
                                                res.status(200).send({
                                                    infoMessage: req.i18n.__("UserDeletion_Completed")
                                                });
                                            });
                                        }
                                    })
                                    .catch(error => {
                                        if (error) {
                                            // Rollback the sql update
                                            done(error, () => {
                                                res.status(404).send({
                                                    errorMessage: req.i18n.__("Err_Users_UserDeletion", error)
                                                });
                                            });
                                        }
                                    });
                            }
                        }
                    }
                );

                deletionRequest.addParameter('CodUser', TYPES.Numeric, id);

                // Performs the deletion query on the relational database
                sql.connection.execSql(deletionRequest);
            }
        }, "USER_DELETE_TRANSACTION", ISOLATION_LEVEL.SNAPSHOT);

    } else {
        res.status(401).send({
            errorMessage: req.i18n.__("Err_UnauthorizedUser")
        });
    }

}


module.exports = {
    getUsersStats,
    getUser,
    putUser,
    deleteUser
};