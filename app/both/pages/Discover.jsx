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
            <li>
              <label>Start from
                <input type="text" onKeyDown={this.onStartNodeKeyPress} defaultValue={this.data.startNode}
                  ref='startNode'/>
              </label>
            </li>
          </ul>
        </div>;
      let randomWalk = this.state.randomWalk ?
        <button className='btn btn-success btn-xs pull-left' onClick={this.stopRandomWalk}>Stop</button> :
        <button className='btn btn-default btn-xs pull-left' onClick={this.startRandomWalk}>Random walk</button>;

      return (
        <section id='graph-section'>
          {options}
          {randomWalk}
          <div className="container-fluid">
            <GithubDiscoverGraph startNode={this.data.startNode}
                members={this.state.members} contributions={this.state.contributions}
                forks={this.state.forks} stars={this.state.stars}
                randomWalk={this.state.randomWalk}/>
          </div>
        </section>
      );
    } else {
      return Home.loginCallToAction;
    }
  },
  getMeteorData() {
    let user = Meteor.user();
    if (user) {
      let startNode = this.state.startNode || user.services.github.username;
      return {
        currentUser: user,
        startNode
      };
    }
  },
  getInitialState() {
    return {
      startNode: null,
      members: true,
      contributions: false,
      forks: false,
      stars: false,
      randomWalk: false,
    };
  },
  onChange() {
    let members = ReactDOM.findDOMNode(this.refs.members).checked;
    let contributions = ReactDOM.findDOMNode(this.refs.contributions).checked;
    let forks = ReactDOM.findDOMNode(this.refs.forks).checked;
    let stars = ReactDOM.findDOMNode(this.refs.stars).checked;
    this.setState({members, contributions, forks, stars});
  },
  onStartNodeKeyPress(e) {
    if (e.keyCode === 13) {
      // Enter pressed
      let startNode = ReactDOM.findDOMNode(this.refs.startNode).value.trim();
      if (startNode) {
        this.setState({startNode});
      }
    }
  },
  startRandomWalk() {
    this.setState({randomWalk: true});
  },
  stopRandomWalk() {
    this.setState({randomWalk: false});
  }
});
