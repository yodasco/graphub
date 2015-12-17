MainLayout = React.createClass({
  render() {
    return (
      <div>
        <Nav/>
        {this.props.content}
        {/* <Footer/> */}
      </div>
    );
  }
});
