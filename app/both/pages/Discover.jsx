Discover = React.createClass({
  mixins: [ReactMeteorData],
  render() {
    if (this.data.currentUser) {
      let options =
        <div className="btn-group pull-right">
          <button type="button" className="btn btn-default btn-xs dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            Options <span className="caret"></span>
          </button>
          <ul className="dropdown-menu">
            <li>
              <div className="checkbox">
                <label>
                  <input type="checkbox" onChange={this.onChange} defaultChecked={this.state.members}
                    ref='members'/> Load members
                </label>
              </div>
            </li>
            <li>
              <div className="checkbox">
                <label>
                  <input type="checkbox" onChange={this.onChange} defaultChecked={this.state.contributions}
                    ref='contributions'/> Load contributions
                </label>
              </div>
            </li>
            <li>
              <div className="checkbox">
                <label>
                  <input type="checkbox" onChange={this.onChange} defaultChecked={this.state.forks}
                    ref='forks'/> Load forks
                </label>
              </div>
            </li>
            <li>
              <div className="checkbox">
                <label>
                  <input type="checkbox" onChange={this.onChange} defaultChecked={this.state.stars}
                    ref='stars'/> Load stars
                </label>
              </div>
            </li>
          </ul>
        </div>;
      return (
        <section id='graph-section'>
          {options}
          <div className="container-fluid">
            <GithubDiscoverGraph user={this.data.currentUser.services.github.username}
                members={this.state.members} contributions={this.state.contributions}
                forks={this.state.forks} stars={this.state.stars}/>
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
      members: true,
      contributions: false,
      forks: false,
      stars: false,
    };
  },
  onChange() {
    let members = ReactDOM.findDOMNode(this.refs.members).checked;
    let contributions = ReactDOM.findDOMNode(this.refs.contributions).checked;
    let forks = ReactDOM.findDOMNode(this.refs.forks).checked;
    let stars = ReactDOM.findDOMNode(this.refs.stars).checked;
    this.setState({members, contributions, forks, stars});
  }
});
