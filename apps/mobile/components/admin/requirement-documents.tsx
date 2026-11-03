import { useCallback, useEffect, useMemo, useState } from 'react';

import { ActivityIndicator, Image, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import StatusBadge from '../ui/status-badge';
import { getStatusColors } from '../../constants/status-colors';
import { getUploadUrl } from '../../utils/media';

/*
 * =========================================================
 * UPLOADED REQUIREMENTS (Admin verification)
 * =========================================================
 *
 * 1. Risk level + automated checks (file is a real image,
 *    readable size, not reused by another account, ID/DTI/
 *    TIN/license formats and expiry dates).
 * 2. Details the applicant typed, to compare with photos.
 * 3. Each document: tap to view full screen, then mark it
 *    "Accept" (green) or "Resubmit" (red). Approve stays
 *    locked until every document is accepted; a HIGH risk
 *    application also needs an explicit confirmation.
 * 4. Audit trail of submissions and decisions.
 *
 * Document links are signed and expire after 15 minutes.
 * =========================================================
 */

export type AutomatedCheck = {
  documentKey: string;
  label: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
};

export type DocumentReview = {
  documentKey: string;
  decision: 'accepted' | 'needs_resubmission';
  note?: string;
};

export type RequirementDocuments = {
  status?: string;
  submittedAt?: string;
  files: { key: string; label: string; path: string }[];
  details?: { label: string; value: string }[];
  automatedChecks?: AutomatedCheck[];
  riskLevel?: 'low' | 'medium' | 'high' | null;
  documentReviews?: DocumentReview[];
  history?: {
    action: string;
    at: string;
    remarks?: string;
    riskLevel?: string;
    by?: { firstName?: string; lastName?: string; role?: string } | string | null;
  }[];
} | null;

/*
 * Review state for one application.
 */
export function useRequirementReview(documents?: RequirementDocuments) {
  const [decisions, setDecisions] = useState<Record<string, DocumentReview>>({});
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);

  const resetKey = documents
    ? `${documents.submittedAt || ''}|${documents.files.map(file => file.key).join(',')}`
    : '';

  useEffect(() => {
    setDecisions({});
    setRiskAcknowledged(false);
  }, [resetKey]);

  const setDecision = useCallback((documentKey: string, decision: DocumentReview['decision']) => {
    setDecisions(current => ({
      ...current,
      [documentKey]: { documentKey, decision, note: current[documentKey]?.note || '' },
    }));
  }, []);

  const setNote = useCallback((documentKey: string, note: string) => {
    setDecisions(current => ({
      ...current,
      [documentKey]: {
        documentKey,
        decision: current[documentKey]?.decision || 'needs_resubmission',
        note,
      },
    }));
  }, []);

  const files = documents?.files || [];
  const acceptedCount = files.filter(file => decisions[file.key]?.decision === 'accepted').length;
  const flaggedCount = files.filter(file => decisions[file.key]?.decision === 'needs_resubmission').length;
  const allAccepted = files.length > 0 && acceptedCount === files.length;
  const highRisk = documents?.riskLevel === 'high';
  const canApprove = allAccepted && (!highRisk || riskAcknowledged);

  const payload = useMemo(
    () => ({
      documentReviews: Object.values(decisions),
      riskAcknowledged,
    }),
    [decisions, riskAcknowledged]
  );

  const blockedReason = !files.length
    ? 'No documents were uploaded.'
    : !allAccepted
      ? `Review every document first: ${acceptedCount}/${files.length} accepted.`
      : highRisk && !riskAcknowledged
        ? 'This application is HIGH RISK. Confirm that you checked the warnings.'
        : '';

  return {
    decisions,
    setDecision,
    setNote,
    riskAcknowledged,
    setRiskAcknowledged,
    acceptedCount,
    flaggedCount,
    allAccepted,
    canApprove,
    blockedReason,
    payload,
  };
}

export type RequirementReviewState = ReturnType<typeof useRequirementReview>;

const ACTION_LABELS: Record<string, string> = {
  submitted: 'Submitted requirements',
  resubmitted: 'Resubmitted requirements',
  approved: 'Approved by Admin',
  rejected: 'Rejected by Admin',
};

const formatDateTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';

const personName = (person: unknown) => {
  if (!person || typeof person !== 'object') return '';
  const { firstName = '', lastName = '' } = person as { firstName?: string; lastName?: string };
  return `${firstName} ${lastName}`.trim();
};

export default function RequirementDocumentsView({
  documents,
  loading = false,
  review,
}: {
  documents?: RequirementDocuments;
  loading?: boolean;
  review?: RequirementReviewState;
}) {
  const [preview, setPreview] = useState<{ label: string; uri: string } | null>(null);

  useEffect(() => {
    setPreview(null);
  }, [documents]);

  const checks = documents?.automatedChecks || [];
  const reviewable = Boolean(review) && documents?.status === 'pending';
  const warnings = checks.filter(check => check.status === 'warning').length;
  const passes = checks.filter(check => check.status === 'pass').length;
  const failures = checks.filter(check => check.status === 'fail').length;
  const risk = documents?.riskLevel;
  const riskColors = getStatusColors(risk || 'neutral');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Uploaded Requirements</Text>

      {loading ? (
        <ActivityIndicator color="#5552B9" style={{ marginVertical: 16 }} />
      ) : !documents || documents.files.length === 0 ? (
        <Text style={styles.empty}>No documents were uploaded yet.</Text>
      ) : (
        <>
          {/* RISK SUMMARY */}
          {risk ? (
            <View style={[styles.riskBox, { backgroundColor: riskColors.background, borderColor: riskColors.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.riskTitle, { color: riskColors.text }]}>Automated security check</Text>
                <StatusBadge status={risk} label={`${risk.toUpperCase()} RISK`} size="sm" />
              </View>
              <Text style={styles.riskText}>
                {passes} passed · {warnings} warning{warnings === 1 ? '' : 's'}
                {failures ? ` · ${failures} failed` : ''}
              </Text>
            </View>
          ) : (
            <Text style={styles.empty}>Submitted before automated checks were added. Review the photos carefully.</Text>
          )}

          {/* DETAILS */}
          {documents.details?.length ? (
            <View style={styles.detailsBox}>
              <Text style={styles.subTitle}>Details typed by the applicant</Text>
              {documents.details.map(item => (
                <View key={item.label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={styles.detailValue}>{item.value}</Text>
                </View>
              ))}
              <Text style={styles.hint}>Compare these with the photos below.</Text>
            </View>
          ) : null}

          {/* DOCUMENTS */}
          {documents.files.map(file => {
            const uri = getUploadUrl(file.path);
            const fileChecks = checks.filter(check => check.documentKey === file.key);
            const decision = review?.decisions[file.key]?.decision
              || documents.documentReviews?.find(item => item.documentKey === file.key)?.decision;

            return (
              <View
                key={file.key}
                style={[
                  styles.docCard,
                  decision && { borderColor: getStatusColors(decision).border, backgroundColor: getStatusColors(decision).background },
                ]}
              >
                <View style={styles.docRow}>
                  <Pressable
                    accessibilityRole="imagebutton"
                    accessibilityLabel={`View ${file.label}`}
                    onPress={() => {
                      if (!uri) return;
                      // PDFs open in the browser; photos open full screen
                      if (/\.pdf(\?|$)/i.test(uri)) void Linking.openURL(uri);
                      else setPreview({ label: file.label, uri });
                    }}
                  >
                    {uri && !/\.pdf(\?|$)/i.test(uri) ? (
                      <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbEmpty]}>
                        <Ionicons name="document-text-outline" size={24} color="#77737B" />
                        <Text style={styles.pdfText}>PDF</Text>
                      </View>
                    )}
                  </Pressable>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.label}>{file.label}</Text>
                    {fileChecks.map((check, index) => {
                      const colors = getStatusColors(check.status);
                      return (
                        <View key={`${check.label}-${index}`} style={styles.checkRow}>
                          <Ionicons name={colors.icon as never} size={14} color={colors.solid} />
                          <Text style={[styles.checkText, { color: colors.text }]}>
                            {check.label !== file.label ? `${check.label}: ` : ''}
                            {check.message}
                          </Text>
                        </View>
                      );
                    })}
                    {decision ? <StatusBadge status={decision} label={decision === 'accepted' ? 'ACCEPTED' : 'RESUBMIT'} size="sm" /> : null}
                  </View>
                </View>

                {reviewable && review ? (
                  <>
                    <View style={styles.decisionRow}>
                      <DecisionButton
                        label="Accept"
                        icon="checkmark-circle"
                        tone="accepted"
                        active={decision === 'accepted'}
                        onPress={() => review.setDecision(file.key, 'accepted')}
                      />
                      <DecisionButton
                        label="Resubmit"
                        icon="close-circle"
                        tone="needs_resubmission"
                        active={decision === 'needs_resubmission'}
                        onPress={() => review.setDecision(file.key, 'needs_resubmission')}
                      />
                    </View>
                    {decision === 'needs_resubmission' ? (
                      <TextInput
                        value={review.decisions[file.key]?.note || ''}
                        onChangeText={value => review.setNote(file.key, value.slice(0, 300))}
                        placeholder="What is wrong? (shown to the applicant)"
                        placeholderTextColor="#9A96A0"
                        style={styles.noteInput}
                      />
                    ) : null}
                  </>
                ) : null}
              </View>
            );
          })}

          {/* REVIEW SUMMARY */}
          {reviewable && review ? (
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {review.acceptedCount}/{documents.files.length} accepted
                {review.flaggedCount ? ` · ${review.flaggedCount} to resubmit` : ''}
              </Text>

              {risk === 'high' ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: review.riskAcknowledged }}
                  onPress={() => review.setRiskAcknowledged(!review.riskAcknowledged)}
                  style={styles.ackRow}
                >
                  <Ionicons
                    name={review.riskAcknowledged ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={getStatusColors('high').solid}
                  />
                  <Text style={styles.ackText}>
                    I checked the high-risk warnings and confirmed the documents with the applicant.
                  </Text>
                </Pressable>
              ) : null}

              {review.blockedReason ? <Text style={styles.blocked}>{review.blockedReason}</Text> : null}
            </View>
          ) : null}

          {/* AUDIT TRAIL */}
          {documents.history?.length ? (
            <View style={styles.historyBox}>
              <Text style={styles.subTitle}>Verification history</Text>
              {[...documents.history].reverse().map((entry, index) => {
                const colors = getStatusColors(
                  entry.action === 'approved' ? 'approved' : entry.action === 'rejected' ? 'rejected' : 'submitted'
                );
                const name = personName(entry.by);
                return (
                  <View key={`${entry.action}-${entry.at}-${index}`} style={styles.historyRow}>
                    <View style={[styles.historyDot, { backgroundColor: colors.solid }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>
                        {ACTION_LABELS[entry.action] || entry.action}
                        {name ? ` · ${name}` : ''}
                      </Text>
                      <Text style={styles.historyMeta}>
                        {formatDateTime(entry.at)}
                        {entry.riskLevel ? ` · ${entry.riskLevel} risk` : ''}
                      </Text>
                      {entry.remarks ? <Text style={styles.historyMeta}>“{entry.remarks}”</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </>
      )}

      <Modal visible={preview !== null} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPreview(null)}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{preview?.label}</Text>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </View>
          {preview ? <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

function DecisionButton({
  label,
  icon,
  tone,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  tone: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = getStatusColors(tone);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.decisionButton,
        { borderColor: colors.solid },
        active && { backgroundColor: colors.solid },
      ]}
    >
      <Ionicons name={icon as never} size={15} color={active ? '#FFFFFF' : colors.solid} />
      <Text style={[styles.decisionText, { color: active ? '#FFFFFF' : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECECF0',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  title: { color: '#3B3940', fontSize: 15, fontWeight: '800' },
  subTitle: { marginBottom: 6, color: '#3B3940', fontSize: 13, fontWeight: '800' },
  empty: { color: '#77737B', fontSize: 13 },
  hint: { marginTop: 4, color: '#77737B', fontSize: 11 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  riskBox: { padding: 12, borderRadius: 12, borderWidth: 1 },
  riskTitle: { fontSize: 13, fontWeight: '800' },
  riskText: { marginTop: 4, color: '#4B5563', fontSize: 12 },
  detailsBox: { padding: 12, borderRadius: 12, backgroundColor: '#F7F7FA' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 10 },
  detailLabel: { color: '#77737B', fontSize: 12 },
  detailValue: { flexShrink: 1, color: '#3B3940', fontSize: 12, fontWeight: '800', textAlign: 'right' },
  docCard: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#ECECF0' },
  docRow: { flexDirection: 'row', gap: 10 },
  thumb: { width: 76, height: 76, borderRadius: 10, backgroundColor: '#F1F1F5' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  pdfText: { marginTop: 2, color: '#77737B', fontSize: 10, fontWeight: '800' },
  label: { color: '#3B3940', fontSize: 13, fontWeight: '800' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  checkText: { flex: 1, fontSize: 11.5, lineHeight: 16, fontWeight: '600' },
  decisionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  decisionButton: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  decisionText: { fontSize: 13, fontWeight: '800' },
  noteInput: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    color: '#3B3940',
    fontSize: 13,
    backgroundColor: '#FFFFFF',
  },
  summary: { padding: 12, borderRadius: 12, backgroundColor: '#F7F7FA', gap: 8 },
  summaryText: { color: '#3B3940', fontSize: 13, fontWeight: '800' },
  ackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  ackText: { flex: 1, color: '#991B1B', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  blocked: { color: '#854D0E', fontSize: 12, fontWeight: '700' },
  historyBox: { paddingTop: 4 },
  historyRow: { flexDirection: 'row', gap: 10, paddingVertical: 5 },
  historyDot: { width: 10, height: 10, marginTop: 4, borderRadius: 5 },
  historyTitle: { color: '#3B3940', fontSize: 12.5, fontWeight: '800' },
  historyMeta: { color: '#77737B', fontSize: 11.5 },
  backdrop: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.9)' },
  previewHeader: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  previewTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  previewImage: { width: '100%', height: '80%' },
});
