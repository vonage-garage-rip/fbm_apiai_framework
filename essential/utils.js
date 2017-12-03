var PNF = require("google-libphonenumber").PhoneNumberFormat
var phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance()

exports.formatPhoneNumber = (number) => {
	if (number.length < 4) {
		return number
	}
	var phoneNumber = phoneUtil.parse(number, "US")
	return phoneUtil.format(phoneNumber, PNF.INTERNATIONAL)
}
  