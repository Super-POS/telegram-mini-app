import type { BotContext } from '../bot';
import { InlineKeyboard } from 'grammy';
import { getBadgeQuestions, assignBadge } from '../api/wallet.api';
import { badgeDisplay, errorMessage, notLinkedMessage } from '../templates/messages.template';
import type { BadgeQuestion } from '../types';

// ─── Entry Point ─────────────────────────────

export async function startBadgeConversation(ctx: BotContext): Promise<void> {
  if (!ctx.session.linkedAccount) {
    await ctx.reply(notLinkedMessage(), { parse_mode: 'HTML' });
    return;
  }

  const loading = await ctx.reply('⏳ Loading badge questions…');

  try {
    const questions = await getBadgeQuestions(ctx.session.linkedAccount.accessToken);
    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);

    if (!questions.length) {
      await ctx.reply('⚠️ No badge questions available right now. Please try again later.');
      return;
    }

    ctx.session.conv = {
      name: 'badge',
      step: 'ask_q',
      data: { questions, answers: [], currentIndex: 0 },
    };

    await sendQuestionCard(ctx, questions, 0);
  } catch (err: unknown) {
    await ctx.api.deleteMessage(ctx.chat!.id, loading.message_id).catch(() => null);
    const msg = err instanceof Error ? err.message : undefined;
    await ctx.reply(errorMessage(msg), { parse_mode: 'HTML' });
  }
}

// ─── Callback Handler (inline button tap) ────

export async function handleBadgeCallback(ctx: BotContext, optionIndex: number): Promise<void> {
  await ctx.answerCallbackQuery();

  if (ctx.session.conv.name !== 'badge' || !ctx.session.linkedAccount) {
    ctx.session.conv = { name: null, step: null, data: {} };
    return;
  }

  const { data } = ctx.session.conv;
  const questions = data.questions as BadgeQuestion[];
  const answers   = (data.answers as string[]) ?? [];
  const currentIndex = (data.currentIndex as number) ?? 0;

  const selectedAnswer = questions[currentIndex]?.options?.[optionIndex];
  if (!selectedAnswer) return;

  // Edit current card to show confirmed answer (remove buttons)
  await ctx.editMessageText(
    questionCardText(questions, currentIndex) +
      `\n\n✅ <b>Your answer:</b> ${selectedAnswer}`,
    { parse_mode: 'HTML' },
  ).catch(() => null);

  answers.push(selectedAnswer);
  const nextIndex = currentIndex + 1;

  if (nextIndex < questions.length) {
    ctx.session.conv.data = { questions, answers, currentIndex: nextIndex };
    await sendQuestionCard(ctx, questions, nextIndex);
    return;
  }

  // All questions answered — submit to AI
  ctx.session.conv = { name: null, step: null, data: {} };

  const loadingMsg = await ctx.reply(
    '🤖 <b>AI is analyzing your answers…</b>\n\nYour badge is being generated. This usually takes 1–2 minutes, please wait…',
    { parse_mode: 'HTML' },
  );

  try {
    const { badge } = await assignBadge(ctx.session.linkedAccount.accessToken, answers);
    await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => null);
    await ctx.reply(badgeDisplay(badge), { parse_mode: 'HTML' });
  } catch (err: unknown) {
    await ctx.api.deleteMessage(ctx.chat!.id, loadingMsg.message_id).catch(() => null);
    const msg = err instanceof Error ? err.message : undefined;
    await ctx.reply(errorMessage(msg), { parse_mode: 'HTML' });
  }
}

// ─── Internal ─────────────────────────────────

function questionCardText(questions: BadgeQuestion[], index: number): string {
  const q = questions[index];
  const progress = `${index + 1}/${questions.length}`;
  return `🏅 <b>Badge Quiz (${progress})</b>\n\n${q.question}`;
}

async function sendQuestionCard(
  ctx: BotContext,
  questions: BadgeQuestion[],
  index: number,
): Promise<void> {
  const q = questions[index];
  const kb = new InlineKeyboard();
  q.options.forEach((opt, i) => kb.row().text(opt, `bq:${i}`));

  await ctx.reply(questionCardText(questions, index), {
    parse_mode: 'HTML',
    reply_markup: kb,
  });
}
