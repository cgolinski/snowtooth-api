const { ApolloServer, PubSub } = require('apollo-server');

const lifts = require('./data/lifts.json');
const trails = require('./data/trails.json');

const pubsub = new PubSub();

const typeDefs = `
  type Trail {
    name: String
    lift: [String]!
    lifts: [Lift]!
    difficulty: String
    status: TrailStatus
    groomed: Boolean
    snowmaking: Boolean
    trees: Boolean
    night: Boolean
    id: String!
  }

  type Lift {
    name: String
    capacity: Int
    status: LiftStatus
    night: Boolean
    elevationGain: Int
    time: String
    trails: [Trail]!
    id: String!
  }

  enum LiftStatus {
    OPEN
    CLOSED
    HOLD
  }
  enum TrailStatus {
    OPEN
    CLOSED
  }
  
  type Query {
    "Number of lifts at Snowtooth Mountain"
    liftCount: Int!
    trailCount: Int!
    allLifts(status: LiftStatus): [Lift!]!
    allTrails(status: TrailStatus): [Trail!]!
    findLiftById(id: String): Lift
    findTrailByName(name: String): Trail
  }

  type Mutation {
    setLiftStatus(id: String!, status: LiftStatus!): Lift!
    setTrailStatus(id: String!, status: TrailStatus!): Trail!
  }

  type Subscription {
    liftStatusChange: Lift
    trailStatusChange: Trail

  }
`;

const resolvers = {
  Query: {
    liftCount: () => lifts.length,
    trailCount: () => trails.length,
    allLifts: (parent, { status }) => {
      if (!status) {
        return lifts;
      } else {
        return lifts.filter(lift => lift.status === status);
      }
    },
    allTrails: (parent, { status }) => {
      if (!status) {
        return trails;
      } else {
        return trails.filter(trail => trail.status === status);
      }
    },
    findLiftById: (parent, { id }) => lifts.find(lift => lift.id === id),
    findTrailByName: (parent, { name }) =>
      trails.find(trail => trail.name === name),
  },
  Mutation: {
    setLiftStatus: (parent, { id, status }) => {
      const liftWithMatchingID = lifts.find(lift => lift.id === id);
      liftWithNewStatus = { ...liftWithMatchingID, status: status };
      pubsub.publish('lift-status-change', {
        liftStatusChange: liftWithNewStatus,
      });
      return liftWithNewStatus;
    },
    setTrailStatus: (parent, { id, status }) => {
      const trailWithMatchingID = trails.find(trail => trail.id === id);
      trailWithNewStatus = { ...trailWithMatchingID, status: status };
      pubsub.publish('trail-status-change', {
        trailStatusChange: trailWithNewStatus,
      });
      return trailWithNewStatus;
    },
  },
  Subscription: {
    liftStatusChange: {
      subscribe: (root, data, { pubsub }) =>
        pubsub.asyncIterator('lift-status-change'),
    },
    trailStatusChange: {
      subscribe: (root, data, { pubsub }) =>
        pubsub.asyncIterator('trail-status-change'),
    },
  },
  Lift: {
    trails: (parent, { id, status }) =>
      trails.filter(trail => trail.lift.includes(parent.id)),
  },
  Trail: {
    lifts: (parent, { id }) =>
      lifts.filter(lift => lift.trails.includes(parent.id)),
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: { pubsub },
});

server.listen().then(({ url }) => console.log(`Server running at ${url}`));
