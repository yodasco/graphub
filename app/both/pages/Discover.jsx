Discover = React.createClass({
  mixins: [ReactMeteorData],
  render() {
    if (this.data.currentUser) {
      return (
        <section id='graph-section'>
          <div className="container">
            <div className="row">
              <GithubDiscoverGraph user={this.data.currentUser.services.github.username} />
            </div>
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
    return {user: null};
  },
});
