About = React.createClass({
  render() {
    return (
      <section className="success" id="about">
        <div className="container">
          <div className="row">
            <div className="col-lg-12 text-center">
              <h2>About</h2>
              <hr className="star-light"/>
            </div>
          </div>
          <div className="row">
            <div className="col-lg-4 col-lg-offset-2">
              <p>
                Graphhub lets our explore GitHub graph, either your personal
                graph or someone else's graph.
              </p>
            </div>
            <div className="col-lg-4">
                <p>TODO: Say more...</p>
            </div>
            <div className="col-lg-8 col-lg-offset-2 text-center">
              <a href="#" className="btn btn-lg btn-outline">
                <i className="fa fa-github"></i> Fork me on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }
});
