Nav = React.createClass({
  mixins: [ReactMeteorData],
  getMeteorData() {
    return {
      currentUser: Meteor.user()
    };
  },
  render() {
    let image = this.data.currentUser ? <img className="img-responsive img-logo" src="/img/profile.png" alt=""/> : '';
    return (
      <nav className="navbar navbar-default navbar-fixed-top">
        <div className="container">
          {/* Brand and toggle get grouped for better mobile display */}
          <div className="navbar-header page-scroll">
            <button type="button" className="navbar-toggle" data-toggle="collapse" data-target="#navbar-collapse">
              <span className="sr-only">Toggle navigation</span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
            </button>
            <a className="navbar-brand" href="/">
              {image}
              Graphub
            </a>
          </div>
          <div className="collapse navbar-collapse" id="navbar-collapse">
            <ul className="nav navbar-nav navbar-right">
              <li className="hidden">
                <a href="/"></a>
              </li>
              <li>
                <a href="/about">About</a>
              </li>
              <li>
                <LoginButtons />
              </li>
            </ul>
          </div>
        </div>
      </nav>
    );
  }
});
