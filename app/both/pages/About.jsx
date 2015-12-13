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
                      <p>Freelancer is a free bootstrap theme created by Start Bootstrap. The download includes the complete source files including HTML, CSS, and JavaScript as well as optional LESS stylesheets for easy customization.</p>
                  </div>
                  <div className="col-lg-4">
                      <p>Whether you're a student looking to showcase your work, a professional looking to attract clients, or a graphic artist looking to share your projects, this template is the perfect starting point!</p>
                  </div>
                  <div className="col-lg-8 col-lg-offset-2 text-center">
                      <a href="#" className="btn btn-lg btn-outline">
                          <i className="fa fa-download"></i> Download Theme
                      </a>
                  </div>
              </div>
          </div>
      </section>
    );
  }
});
