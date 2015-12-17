Home = React.createClass({
  mixins: [ReactMeteorData],
  render() {
    if (this.data.currentUser) {
      return (
        <section id='graph-section'>
          <div className="container">
            <div className="row">
              <GithubUsernameInputs onSubmit={this.onSubmit}/>
              <GithubGraph user1={this.state.user1}
                           user2={this.state.user2}/>
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
  onSubmit(user1, user2) {
    this.setState({user1, user2});
  },
  getInitialState() {
    return {user1: undefined, user2: undefined};
  },
});

Home.loginCallToAction =
  <header>
    <div className="container">
      <div className="row">
        <div className="col-lg-12">
          <main>
            <img className="img-responsive" src="/img/profile.png" alt=""/>
            <div className="intro-text">
              <span className="name">Explore your GitHub Graph</span>
              <hr className="star-light"/>
              <span className="skills">Login with GitHub to explore your github graph</span>
            </div>
          </main>
        </div>
      </div>
    </div>
  </header>;
