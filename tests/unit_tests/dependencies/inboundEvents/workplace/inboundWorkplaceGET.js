module.exports = {
	method: "GET",
	query: {
		"hub.mode": "subscribe",
		"hub.verify_token": process.env.WORKPLACE_VERIFY_TOKEN
	}
}