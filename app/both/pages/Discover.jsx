Discover = React.createClass({
  mixins: [ReactMeteorData],
  render() {
    if (this.data.currentUser) {
      return (
        <section id='graph-section'>
          <div className="container">
            <GithubDiscoverGraph user={this.data.currentUser.services.github.username} />
          </div>
        </section>
      );
    } else {
      return Home.loginCallToAction;
    }
  },
  getMeteorData() {
    return {
      currentUser: Meteor.user()
    };
  },
  getInitialState() {
    return {
      user: null,
    };
  },
});
