class emptyBase {}

var userDbMixin = Base => class extends Base {
    getUser() { throw error }
  };