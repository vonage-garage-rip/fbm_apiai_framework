module.exports = {
    method: 'POST',
    body: {
        object: 'page',
        entry: [{
            id: '000000000000000',
            changes: [{
                value: {
                    post_id: "1234",
                    sender_id: "4321",
                    message: "Page Test Message"
                }
            }]
        }]
    }
}