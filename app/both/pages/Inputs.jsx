GithubUsernameInputs = React.createClass({
  propTypes: {
    onSubmit: React.PropTypes.func.isRequired,
  },
  ghUserOptions: [
    {value: 'mojombo', label: 'Tom Preston-Werner'},
    {value: 'defunkt', label: 'Chris Wanstrath'},
    {value: 'addyosmani', label: 'Addy Osmani'},
    {value: 'mbostock', label: 'Mike Bostock'},
    {value: 'jashkenas', label: 'Jeremy Ashkenas'},
    {value: 'tj', label: 'TJ Holowaychuk'},
    {value: 'dhh', label: 'David Heinemeier Hansson'},
    {value: 'torvalds', label: 'Linus Torvalds'}
  ],
  render() {
    return (
      <div className="col-lg-12 text-center">
        <form className='form-inline' onSubmit={this.onSubmit}>
          <h3>
            Calculate your github distance from&nbsp;<select className='form-control' onChange={this.onChange} ref='select' defaultValue=''>
              <option value=''>&lt;select one&gt;</option>
              {this.ghUserOptions.map(function(o) {
                return <option key={o.value} value={o.value}>{o.label}</option>;
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
