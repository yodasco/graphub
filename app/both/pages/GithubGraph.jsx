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
      </div>
    );
  },
  componentDidUpdate(prevProps, prevState) {
    if (this.props.username1 && this.props.username2) {
      Meteor.call('getShortestPath', this.props.username1,
                  this.props.username2,
        (err, res)=> {
          if (err) {
            console.error(err);
            return;
          }
          console.log(res);
        }
      );
    }
  }
});
