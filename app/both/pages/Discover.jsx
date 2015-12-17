Discover = React.createClass({
  mixins: [ReactMeteorData],
  render() {
    if (this.data.currentUser) {
      return (
        <section id='graph-section'>
          <div className="container">
            <form className='form-inline'>
              <div className="checkbox">
                <label>
                  <input type="checkbox" ref='membership'
                         defaultChecked={this.state.membership}
                         onChange={this.onChange}/> Membership
                </label>
              </div>
              <div className="checkbox">
                <label>
                  <input type="checkbox" ref='contributions'
                         defaultChecked={this.state.contributions}
                         onChange={this.onChange}/> Contributions
                </label>
              </div>
            </form>
            <GithubDiscoverGraph user={this.data.currentUser.services.github.username}
                membership={this.state.membership}
                contributions={this.state.contributions} />
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
      membership: true,
      contributions: false
    };
  },
  onChange() {
    let membership = ReactDOM.findDOMNode(this.refs.membership).checked;
    let contributions = ReactDOM.findDOMNode(this.refs.contributions).checked;
    this.setState({contributions, membership});
  },
});
