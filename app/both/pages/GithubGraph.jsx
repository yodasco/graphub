GithubGraph = React.createClass({
  propTypes: {
    username1: React.PropTypes.string,
    username2: React.PropTypes.string,
  },
  render() {
    return (
      <div>
        <h1>{this.props.username1}</h1>
        <h1>{this.props.username2}</h1>
        <pre>{this.state.queryResult}</pre>
      </div>
    );
  },
  componentWillReceiveProps(nextProps) {
    if (nextProps.username1 && nextProps.username2) {
      Meteor.call('getShortestPath', nextProps.username1,
                  nextProps.username2,
        (err, res)=> {
          if (err) {
            console.error(err);
            return;
          }
          this.setState({queryResult: res});
          console.log(res);
        }
      );
    }
  },
  getInitialState() {
    return {queryResult: null};
  }
});
