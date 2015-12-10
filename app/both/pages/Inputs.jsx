GithubUsernameInputs = React.createClass({
  propTypes: {
    onSubmit: React.PropTypes.func.isRequired,
  },
  render() {
    return (
      <form className='form' onSubmit={this.onSubmit}>
        <div className='row'>
          <div className='col-xs-12 col-sm-4'>
            <div className='form-group'>
              <input type='text' ref='username1' className='form-control' placeholder='Github username 1'/>
            </div>
          </div>
          <div className='col-xs-12 col-sm-4'>
            <div className='form-group'>
              <input type='text' ref='username2' className='form-control' placeholder='Github username 2'/>
            </div>
          </div>
          <div className='col-xs-12 col-sm-4'>
            <button className='btn btn-primary btn-block'>Submit</button>
          </div>
        </div>
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
