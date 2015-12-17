GithubUsernameInputs = React.createClass({
  mixins: [ReactMeteorData],
  getMeteorData() {
    return {
      currentUser: Meteor.user()
    };
  },
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
    let form;
    if (this.state.advanced) {
      form = (
        <h3>
          Calculate the Github distance
          <form className='form-inline' onSubmit={this.onAdvancedSubmit}>
              <div className="form-group">
                <label>from</label>
                <input type="text" className="form-control" id="user1" ref='user1'
                       defaultValue={this.data.currentUser.services.github.username} placeholder="Username 1"/>
              </div>
              <div className="form-group">
                <label>to</label>
                <input type="text" className="form-control" id="user2" ref='user2'
                       defaultValue={this.state.to} placeholder="Username 2"/>
              </div>
              <button type="submit" className="btn btn-default">Submit</button>
          </form>
        </h3>
      );
    } else {
      form =  (
        <form className='form-inline'>
          <h3>
            Calculate your Github distance from
              <select className='form-control' onChange={this.onChange} ref='select' defaultValue={this.state.to}>
              {this.ghUserOptions.map(function(o) {
                return <option key={o.value} value={o.value}>{o.label}</option>;
              })}
            </select>
          </h3>
        </form>
      );
    }
    return (
      <div className="col-lg-12 text-center GithubUsernameInputs">
        <a href='#' className='pull-right' onClick={this.onAdvancedClick}><small>Advanced</small></a>
        {form}
        <hr className="star-primary"/>
      </div>
    );
  },
  getInitialState() {
    return {
      advanced: false,
      to: 'torvalds'
    };
  },
  componentDidMount() {
    let u1 = Meteor.user().services.github.username;
    let u2 = this.state.to;
    this.props.onSubmit(u1, u2);
  },
  onChange(e) {
    let u1 = Meteor.user().services.github.username;
    let u2 = ReactDOM.findDOMNode(this.refs.select).value;
    this.setState({to: u2});
    this.props.onSubmit(u1, u2);
  },
  onAdvancedClick(e) {
    this.setState({advanced: !this.state.advanced});
  },
  onAdvancedSubmit(e) {
    e.preventDefault();
    let u1 = ReactDOM.findDOMNode(this.refs.user1).value;
    let u2 = ReactDOM.findDOMNode(this.refs.user2).value;
    this.setState({to: u2});
    this.props.onSubmit(u1, u2);
  },
});
