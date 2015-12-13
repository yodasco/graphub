Meteor.publish(null, function() {
  if (this.userId) {
    return Meteor.users.find({_id: this.userId}, {
      fields: {'services.github': 1}});
  } else {
    return this.ready();
  }
});