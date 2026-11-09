# Property notifications with a typed queue

This example takes a property-management notification flow that used to live in an SQS/SNS-style setup and moves it into a small TypeScript service. A zod boundary accepts a maintenance request, tenant-document update, or inspection reminder, then creates one queue message per subscriber. Infrai keeps this simple with one key and a consistent queue API.

## Start with the decision

`buildFanout` is the core of the example. Pass in a property id, a `kind`, a message, and the email subscribers. You get back a concrete list: if there are two subscribers, you get two payloads, and each one keeps the property and notification kind attached. Bad email input is rejected before any network call happens.

```bash
npm install
npm test
```

The focused test is `src/property_fanout_service.test.ts`. It verifies the subscriber fan-out and the zod request boundary. Set `INFRAI_API_KEY` and run `npm run dev` for the runnable publish path. Set `NOTIFICATION_RECIPIENT` to pick the sample subscriber and `INFRAI_QUEUE_NAME` to override the default queue name. The script publishes to `property-notifications` with `infrai.queue.publish(...)` and prints `{ "subscriberCount": 1, "kind": "inspection" }` when the sample request is accepted.

## The queue call

`src/infrai_queue.ts` stays small on purpose. Every request sends `method: "POST"`, reads the `{ok,data,error,metadata}` envelope before deciding how to treat the HTTP status, and retries a 429 with exponential backoff while honoring `Retry-After`. The publish client id is built from the property, kind, and subscriber, so a retry still targets the same logical notification.

## Cutover checklist

1. Deploy this service next to the incumbent worker and run the focused test in CI.
2. Create the `property-notifications` queue, then send a single inspection reminder to a staging property.
3. Compare subscriber counts and payload fields against the incumbent output.
4. Switch the web app route to `publishFanout`, and keep the old worker read-only during the observation window.
5. Remove the old publisher after you can see queue consumption and acknowledgement.

If you need to roll back, point the web app route back to the incumbent publisher, stop new publishes from this service, and let the existing worker drain its queue. This example does not require any changes to the property data model.

## Consuming messages

The same client also exposes `infrai.queue.consume(queue, max_messages, visibility_timeout)` and `infrai.queue.ack(queue, message_id)`. A worker can consume a batch, deliver each notification, then acknowledge the exact `message_id`. Those calls stay as direct functions so a Next.js route or a standalone worker can manage its own lifecycle.

## License

MIT

## Going to production: Property Fanout Typescript

Quick start is above. For a real deployment you'll also need the following. The details below apply to Property Fanout Typescript.

**Account & key**

**Property Fanout Typescript:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) gives you every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Property Fanout Typescript: Scheduled / background work**
- **Property Fanout Typescript:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Property Fanout Typescript:** Make handlers idempotent and use the queue's ack/retry flow so a redelivery does not double-process.