About = React.createClass({
  mixins: [ReactMeteorData],
  getMeteorData() {
    return {
      currentUser: Meteor.user()
    };
  },
  render() {

    let loginButton = this.data.currentUser ? '' :
      <div>
        <button className='btn btn-lg btn-outline' onClick={this.login}>Login to find your Torvalds number</button>
      </div>;

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
            <div className="col-lg-8 col-lg-offset-2">
              <p>
                Graphhub lets our explore GitHub graph, either your personal
                graph or someone else's graph.
              </p>
              <p>
                The inspiration for Graphub is <a href='https://en.wikipedia.org/wiki/Erd%C5%91s_number'>Erdős number</a>.
                The Erdős number describes the "collaborative distance" between mathematician Paul Erdős and another person, as measured by authorship of mathematical papers.
                in essense, Erdős number describes "how close" is certain mathematician to the famous Hungarian mathematician Erdős.
              </p>
              <p>
                As it turns out, movie actors have a similar mechanism dubbed <a href='https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon#Bacon_numbers'>Bacon number</a> which
                describes "how close" a certain actor is to the famous actor Kevin Bacon.
                For example Elvis Presley has a bacon number of #2 since
                Elvis Presley was in Change of Habit (1969) with Edward Asner,
                and Edward Asner was in JFK (1991) with Kevin Bacon.
                So Bacon himself has a Bacon number #0 while
                Edward Asner has Bacon number of #1 and Elvis Presley has Bacon number of #2.
              </p>
              <p>
                So we thought:
              </p>
              <h3>why shouldn't open source developers have a number for themselves?</h3>
              <p>
                Althogh there had been previous similar work on cetain open source libraries and cetain smaller communities,
                this time we decided to run this algorithm over the entire GitHub data.
                And who shall we choose to be #0? There are a few natural candidates and eventually we choose <em>Linus Torvalds</em>, creator of Linux, although on this website you're free to play with other reference points from amongs the most popular GH users.
              </p>
            </div>
            <div className="col-lg-8 col-lg-offset-2 text-center">
              {loginButton}
              <a href="https://github.com/yodasco/graphub" className="btn btn-outline">
                <i className="fa fa-github"></i> Fork me on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  },
  login() {
    Meteor.loginWithGithub({}, function() {
      document.location.href = '/';
    });
  }
});
