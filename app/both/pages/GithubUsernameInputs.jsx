let defaultUser = 'torvalds';
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
    {label: 'Jake Wharton', value: 'JakeWharton'},
    {label: 'Scott Chacon', value: 'schacon'},
    {label: 'John Resig', value: 'jeresig'},
    {label: 'Douglas Crockford', value: 'douglascrockford'},
    {label: 'Mattt Thompson', value: 'mattt'},
    {label: 'PJ Hyett', value: 'pjhyett'},
    {label: 'Mark Otto', value: 'mdo'},
    {label: 'Jessica Lord', value: 'jlord'},
    {label: 'James Halliday', value: 'substack'},
    {label: 'Kenneth Reitz', value: 'kennethreitz'},
    {label: 'Yehuda Katz', value: 'wycats'},
    {label: 'Ryan Bates', value: 'ryanb'},
    {label: 'Ricardo Cabello', value: 'mrdoob'},
    {label: 'Sindre Sorhus', value: 'sindresorhus'},
    {label: 'Tim Pope', value: 'tpope'},
    {label: 'Lea Verou', value: 'LeaVerou'},
    {value: 'torvalds', label: 'Linus Torvalds'}
  ],
  render() {
    return (
      <div className="col-lg-12 text-center GithubUsernameInputs">
        <form className='form-inline' onSubmit={this.onSubmit}>
          <h3>
            Calculate your github distance from
              <select className='form-control' onChange={this.onChange} ref='select' defaultValue={defaultUser}>
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
  componentDidMount() {
    let u1 = Meteor.user().services.github.username;
    let u2 = defaultUser;
    this.props.onSubmit(u1, u2);
  },
  onChange(e) {
    let u1 = Meteor.user().services.github.username;
    let u2 = ReactDOM.findDOMNode(this.refs.select).value;
    this.props.onSubmit(u1, u2);
  },

});
