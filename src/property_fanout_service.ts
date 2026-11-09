import { z } from "zod";
import { infrai } from "./infrai_queue.js";

export const notificationRequest = z.object({
  propertyId: z.string().min(1),
  kind: z.enum(["maintenance", "tenant_document", "inspection"]),
  message: z.string().min(1),
  subscribers: z.array(z.string().email()).min(1)
});
export type NotificationRequest = z.infer<typeof notificationRequest>;

export function buildFanout(request: NotificationRequest) {
  const parsed = notificationRequest.parse(request);
  return parsed.subscribers.map((subscriber) => ({
    subscriber,
    propertyId: parsed.propertyId,
    kind: parsed.kind,
    message: parsed.message
  }));
}

export async function publishFanout(request: NotificationRequest, queue = "property-notifications") {
  const messages = buildFanout(request);
  await infrai.queue.create(queue);
  const published = [];
  for (const message of messages) {
    const payload = { ...message, deliveryKey: `${message.propertyId}:${message.kind}:${message.subscriber}` };
    published.push(await infrai.queue.publish(queue, payload));
  }
  return { subscriberCount: published.length, kind: request.kind };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample: NotificationRequest = { propertyId: "building-17", kind: "inspection", message: "Inspection reminder for Friday at 10:00", subscribers: [process.env.NOTIFICATION_RECIPIENT ?? "tenant@example.com"] };
  publishFanout(sample, process.env.INFRAI_QUEUE_NAME).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
