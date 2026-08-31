import type {
  DecisionCastFacts,
  DiscordEmbedField,
  DiscordWebhookPayload,
  NotificationContext,
  SubmissionCreatedFacts,
  VoteRecordedFacts,
} from './types'

/** The settled Discord embed colors (spec §Presentation): blue for a new
 *  submission, green for a yes-vote / approval, red for a no-vote /
 *  rejection. Discord colors are 24-bit integers — these are the default
 *  embed palette's decimals. */
export const EMBED_COLOR = {
  blue: 0x3498DB,
  green: 0x2ECC71,
  red: 0xE74C3C,
} as const

/** The fixed sender name every payload carries (spec §Presentation). */
export const SENDER_NAME = 'CS2KZ Submissions'

/** Discord rejects an embed field with an empty value (400), so a null
 *  Decision note renders as this "none" marker — never an empty string. */
const NO_NOTE = '—'

/** One embed field. The spec settles the fields but not the layout hint, so
 *  `inline` stays uniformly false (full width): long values — workshop URLs,
 *  rejection reasons, notes — render on their own line. */
function field(name: string, value: string): DiscordEmbedField {
  return { name, value, inline: false }
}

/** The submission-created embed: blue, `Submission: <mapName>`, the
 *  submitting *account's* display name (Mapper and Submitter are different
 *  concepts — CONTEXT.md), the workshop URL, the course count, and a Port
 *  flag on a port. The submitter display name and the course count come from
 *  the context read; everything else is in the create facts. */
export function submissionCreatedPayload(
  facts: SubmissionCreatedFacts,
  context: Pick<NotificationContext, 'submitterDisplayName' | 'courseCount'>,
  submissionUrl: string | undefined,
): DiscordWebhookPayload {
  const fields = [
    field('Submitter', context.submitterDisplayName),
    field('Workshop', facts.workshopUrl),
    field('Courses', String(context.courseCount)),
  ]
  if (facts.isPort) {
    fields.push(field('Port', 'Yes'))
  }
  return {
    username: SENDER_NAME,
    embeds: [
      {
        title: `Submission: ${facts.mapName}`,
        color: EMBED_COLOR.blue,
        url: submissionUrl,
        fields,
      },
    ],
  }
}

/** The vote-recorded embed: green on a yes-vote, red on a no-vote,
 *  `Vote: <mapName>`, the approver's display name, the Decision (YES/NO),
 *  and the Rejection reason on a no-vote. The title's map name and the
 *  approver display name come from the context read. */
export function voteRecordedPayload(
  facts: VoteRecordedFacts,
  context: { mapName: string; approverDisplayName: string },
  submissionUrl: string | undefined,
): DiscordWebhookPayload {
  const fields = [
    field('Approver', context.approverDisplayName),
    field('Decision', facts.approvalDecision === 'yes' ? 'YES' : 'NO'),
  ]
  // The shared vote schema already requires a trimmed non-empty Rejection
  // reason on a no-vote; the truthy guard keeps the template total even if a
  // caller ever slipped a null through.
  if (facts.approvalDecision === 'no' && facts.rejectionReason) {
    fields.push(field('Rejection reason', facts.rejectionReason))
  }
  return {
    username: SENDER_NAME,
    embeds: [
      {
        title: `Vote: ${context.mapName}`,
        color:
          facts.approvalDecision === 'yes'
            ? EMBED_COLOR.green
            : EMBED_COLOR.red,
        url: submissionUrl,
        fields,
      },
    ],
  }
}

/** The decision-cast embed: green on approval, red on rejection,
 *  `Approved: <mapName>` / `Rejected: <mapName>`, the lead approver's
 *  display name, and the Decision note — always present, a null note
 *  rendering as the "none" marker. The title's map name and the lead display
 *  name come from the context read. */
export function decisionCastPayload(
  facts: DecisionCastFacts,
  context: { mapName: string; leadDisplayName: string },
  submissionUrl: string | undefined,
): DiscordWebhookPayload {
  return {
    username: SENDER_NAME,
    embeds: [
      {
        title: `${facts.status === 'approved' ? 'Approved' : 'Rejected'}: ${context.mapName}`,
        color:
          facts.status === 'approved' ? EMBED_COLOR.green : EMBED_COLOR.red,
        url: submissionUrl,
        fields: [
          field('Lead approver', context.leadDisplayName),
          field('Decision note', facts.decisionNotes ?? NO_NOTE),
        ],
      },
    ],
  }
}