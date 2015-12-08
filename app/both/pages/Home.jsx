Home = React.createClass({
  render() {
    return (
      <div className='container-fluid'>
        <h1>Welcome to Graphub!</h1>
        <GithubUsernameInputs onSubmit={this.onSubmit}/>
        <GithubGraph username1={this.state.username1}
                     username2={this.state.username2}/>
      </div>
    );
  },
  onSubmit(username1, username2) {
    this.setState({username1, username2});
  },
  getInitialState() {
    return {username1: undefined, username2: undefined};
  },

});
