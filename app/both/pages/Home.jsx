Home = React.createClass({
  render() {
    return (
      <div>
        <img className="img-responsive" src="img/profile.png" alt=""/>
        <div className="intro-text">
          <span className="name">Explore your GitHub Graph</span>
          <hr className="star-light"/>
          <span className="skills">Login with GitHub to explore your github graph</span>
        </div>

        <GithubUsernameInputs onSubmit={this.onSubmit}/>
        <GithubGraph user1={this.state.user1}
                     user2={this.state.user2}/>
      </div>
    );
  },
  onSubmit(user1, user2) {
    this.setState({user1, user2});
  },
  getInitialState() {
    return {user1: undefined, user2: undefined};
  },

});
