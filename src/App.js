import React, { Component } from 'react';
import MUIDataTable from 'mui-datatables';
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';  
import { PacmanLoader } from 'react-spinners';
import moment from 'moment';
import './App.css';

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      count: 0,
      aggregatedEvents: []
    }
  }

  async getAggregationData() {
    let schedules =  await fetch('https://api.tmf.zone/prod/v1/schedules');
    schedules = await schedules.json();

    let events = await fetch('https://api.tmf.zone/prod/v1/events');
    events = await events.json();

    const aggregationData = { 
      schedules: schedules.body,
      events: events.body 
    };

    return aggregationData;
  }

  componentDidMount() {
    this.getAggregationData().then(({ schedules, events }) => {

      // filter to only schedules updated w/in 30 days
      const recentlyUpdatedSchedules = schedules.filter(schedule => {
        return moment(schedule.updated).isAfter(moment().subtract(90, 'days'));
      });

      // aggregate how many schedules have the events
      let aggregatedEvents = recentlyUpdatedSchedules.reduce((acc, schedule) => {
        
        // aggregate the events
        schedule.events.forEach(event => {
            if (event && event.includes('2019-')) {
              if (acc.has(event)) {
                acc.set(event, acc.get(event) + 1);
              } else {
                acc.set(event, 1);
              }
            }
          });
          return acc;

        },
        new Map()
      );

      // map them to a table view
      aggregatedEvents = Array.from(aggregatedEvents.keys()).map(eventId => {

        // lookup how many people are planning on attending
        const eventCount = aggregatedEvents.get(eventId);
        if (eventCount < 20) {
          return null;
        }

        // dig up event info
        const event = events.filter(event => event.id === eventId)[0];
        if (event) {
          const eventName = event.name;
          const eventVenue = event.venue.name;
          const eventDay = moment(event.start_time).format('dddd');

          return { eventId, eventName, eventVenue, eventDay, eventCount };
        } else {
          return null;
        }

      }).filter(event => event !== null);

      this.setState({
        count: recentlyUpdatedSchedules.length,
        aggregatedEvents: aggregatedEvents.sort((a, b) => b.eventCount - a.eventCount)
      });
    });
  }

  getMuiTheme() {
    return createMuiTheme({
      palette: {
        type: 'dark'
      }
    });
  }

  render() {
    const { aggregatedEvents } = this.state;

    if (aggregatedEvents.length) {
      const columns = [
        { name: 'eventName',  label: 'Name',          options: { sort: true, filter: false } },
        { name: 'eventVenue', label: 'Venue',         options: { sort: true } },
        { name: 'eventDay',   label: 'Festival Day',  options: { sort: true } },
        { name: 'eventCount', label: 'Attending',     options: { sort: true, filter: false } }
      ];
      
      const options = { pagination: false };
      
      return (
        <MuiThemeProvider theme={this.getMuiTheme()}>
          <MUIDataTable 
            title={'Treefort Event Predictions'} 
            data={aggregatedEvents} 
            columns={columns} 
            options={options}
          />
        </MuiThemeProvider>
      );
    } else {
      return  (<div className={'loader'}>
        <PacmanLoader
          sizeUnit={'px'}
          size={50}
          color={'white'}
          loading={true}
        />
      </div>
      );
    }
  }
}

export default App;
