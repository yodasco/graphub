GithubUsernameInputs = React.createClass({
  propTypes: {
    onSubmit: React.PropTypes.func.isRequired,
  },
  ghUserOptions: [
    {key: 'mojombo', displayName: 'Tom Preston-Werner'},
    {key: 'defunkt', displayName: 'Chris Wanstrath'},
    {key: 'addyosmani', displayName: 'Addy Osmani'},
    {key: 'mbostock', displayName: 'Mike Bostock'},
    {key: 'jashkenas', displayName: 'Jeremy Ashkenas'},
    {key: 'tj', displayName: 'TJ Holowaychuk'},
    {key: 'dhh', displayName: 'David Heinemeier Hansson'},
    {key: 'torvalds', displayName: 'Linus Torvalds'}
  ],
  render() {
    return (
      <div className="col-lg-12 text-center">
        <form className='form-inline' onSubmit={this.onSubmit}>
          <h3>
            Calculate your github distance from&nbsp;<select className='form-control' onChange={this.onChange} ref='select' defaultValue=''>
              <option value=''>&lt;select one&gt;</option>
              {this.ghUserOptions.map(function(o) {
                return <option key={o.key} value={o.key}>{o.displayName}</option>;
              })}
            </select>
          </h3>
        </form>
        <hr className="star-primary"/>
      </div>
    );
  },
  onChange(e) {
    e.preventDefault();
    let u1 = Meteor.user().services.github.username;
    let u2 = ReactDOM.findDOMNode(this.refs.select).value;
    this.props.onSubmit(u1, u2);
  },

});
