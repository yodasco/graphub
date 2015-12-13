MainLayout = React.createClass({
  render() {
    return (
      <div>
        <Nav/>
        {this.props.content}
        <footer className="text-center">
          <div className="footer-below">
            <div className="container">
              <div className="row">
                <div className="col-lg-12">
                  Copyright &copy; Yodas 2015
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }
});
