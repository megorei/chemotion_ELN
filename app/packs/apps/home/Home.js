// Imports from node modules
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Grid, Row } from 'react-bootstrap';

// Imports from other namespaces
import Navigation from '/app/packs/shared_components/navigation/Navigation';
import XHome from '/app/packs/src/components/extra/HomeXHome';

// Imports from own namespace
import WelcomeMessage from './components/WelcomeMessage';

const extraHomes = () => {
  const homes = [];
  const count = XHome.count || 0;
  for (let j = 0; j < count; j += 1) {
    homes.push(XHome[`content${j}`]);
  }
  return homes;
};

class Home extends Component {
  constructor(props) {
    super();
  }

  render() {
    return (
      <div>
        {XHome.count && XHome.count > 0
          ? extraHomes().map((Annex, i) => <Annex key={`Annex_${i}`} />)
          : <Grid fluid>
            <Row className="card-navigation">
              <Navigation />
            </Row>
            <Row className="card-content">
              <WelcomeMessage />
            </Row>
          </Grid>
        }
      </div>
    );
  }
}

// $(document).ready(function() {
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('Home');
  if (domElement) { ReactDOM.render(<Home />, domElement); }
});