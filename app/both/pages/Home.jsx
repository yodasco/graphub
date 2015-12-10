Home = React.createClass({
  render() {
    return (
      <div className='container-fluid'>
        <h3>Welcome to Graphub!</h3>
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
