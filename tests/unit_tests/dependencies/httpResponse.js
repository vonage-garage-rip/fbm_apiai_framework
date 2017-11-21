module.exports = {
  statusCode: 0,
  sendStatus: function(status){
    this.statusCode = status;
    
    return this.statusCode;
  },
  status: function(status){
    this.statusCode = status;

    return this;
  },
  send: function(value){
    return value;
  }
}