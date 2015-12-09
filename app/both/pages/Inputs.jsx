GithubUsernameInputs = React.createClass({
  propTypes: {
    onSubmit: React.PropTypes.func.isRequired,
  },
  render() {
    return (
      <form className='form' onSubmit={this.onSubmit}>
        <div className='form-group'>
          <label>Github username 1</label>
          <input type='text' ref='username1' className='form-control'/>
        </div>
        <div className='form-group'>
          <label>Github username 2</label>
          <input type='text' ref='username2' className='form-control'/>
        </div>
        <button className='btn btn-primary btn-lg btn-block'>Submit</button>
      </form>
    );
  },
  onSubmit(e) {
    e.preventDefault();
    let u1 = ReactDOM.findDOMNode(this.refs.username1).value.trim();
    let u2 = ReactDOM.findDOMNode(this.refs.username2).value.trim();
    this.props.onSubmit(u1, u2);
  }
});
