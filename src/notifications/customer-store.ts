/**
 * In-memory store for Telegram chat IDs of linked customers.
 *
 * In production, replace this with Redis or a database lookup.
 */

const _customerChatIds = new Map<number, number>(); // customerId → chatId

export const customerStore = {
  link(customerId: number, chatId: number): void {
    _customerChatIds.set(customerId, chatId);
  },
  unlink(customerId: number): void {
    _customerChatIds.delete(customerId);
  },
  getChatId(customerId: number): number | undefined {
    return _customerChatIds.get(customerId);
  },
  getAllChatIds(): number[] {
    return Array.from(_customerChatIds.values());
  },
};
