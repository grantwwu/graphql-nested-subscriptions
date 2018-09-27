const { ApolloServer, gql, PubSub } = require('apollo-server');
const { makeExecutableSchema }      = require('graphql-tools');

const PUBSUB_TOPIC = 'MY_TOPIC';

const pubsub = new PubSub();

const foo = { fooObj: true };

const typeDefs = gql`

    schema
    {
        subscription: Subscription
        query: Query
    }
    
    type Query
    {
        foo: String
    }
    
    type Foo
    {
        nested: String
    }

    type Subscription
    {
        foo: Foo
        unnested: String
    }
`;

const resolvers =
{
    Subscription:
    {
        foo: () => foo,
        unnested:
        {
            resolve: (obj) => obj,
            subscribe: () => pubsub.asyncIterator(PUBSUB_TOPIC)
        }
    },
    Foo:
    {
        nested:
        {
            resolve: (obj) => obj,
            subscribe: (obj) =>
            {
                // Expecting { fooObj: true } here
                console.log(obj);
                return pubsub.asyncIterator(PUBSUB_TOPIC);
            }
        }
    },
    Query:
    {
        foo: () => "It's working!"
    }
};

const schema = makeExecutableSchema({typeDefs, resolvers});

const server = new ApolloServer(
    {
        schema,
        context: async ({ req, connection }) =>
        {
            if (connection)
            {
                return {};
            }
            else
            {
                const token = req.headers.authorization || "";
                return { token };
            }
    },
    }
);

setInterval(() => pubsub.publish(PUBSUB_TOPIC, 'barbar'), 1000);

server.listen().then(({ url, subscriptionsUrl  }) => {
    console.log(`🚀  Server ready at ${url}`);
    console.log(`🚀 Subscriptions ready at ${subscriptionsUrl}`);
});

/*
Subscription query results in GraphiQL:

subscription{ foo { nested } }:
{
  "error": {
    "message": "Subscription field must return Async Iterable. Received: undefined"
  }
}


subscription{ unnested }:
{
  "data": {
    "unnested": "barbar"
  }
}
... every second

 */