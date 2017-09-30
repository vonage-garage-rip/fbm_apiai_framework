const fetch = require('node-fetch')

const AUTOMATIC_API_BASE_URL = "https://api.automatic.com/"
var accessToken = ""

const setAccessToken = newAccessToken => {
    accessToken = newAccessToken
}

const getVehicleInfo = () => {
    return new Promise(function (resolve, reject) {
        fetch(AUTOMATIC_API_BASE_URL + "vehicle/", {headers: {"Authorization": "Bearer " + accessToken}})
        .then(function(res) {
            return res.json();
        }
        ).then(function(json) {
            return resolve(json)
        })
        .catch(err => {
            console.log("getVehicleInfo caught an error: " + err);
            return reject(err);
          })
    })
}

module.exports = { setAccessToken, getVehicleInfo }