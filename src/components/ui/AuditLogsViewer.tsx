import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { useTheme } from '@/store/useThemeStore';
import { typography } from '@/theme/typography';
import { radii } from '@/theme/spacing';
import { AuditLog } from '@/features/audit/types';
import { fuzzySearchAuditLogs, calculateDailyAuditActivity } from '@/features/audit/auditEngine';

interface AuditLogsViewerProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

const PAGE_SIZE = 5;

export function AuditLogsViewer({ logs, isLoading = false }: AuditLogsViewerProps) {
  const { colors: dynamicColors, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Accurate searching with typo tolerance
  const filteredLogs = useMemo(() => {
    return fuzzySearchAuditLogs(logs, searchQuery);
  }, [logs, searchQuery]);

  // Reset page when search changes
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * PAGE_SIZE;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + PAGE_SIZE);

  // Mini canvas activity points (last 7 days)
  const activityData = useMemo(() => {
    return calculateDailyAuditActivity(logs, 7);
  }, [logs]);

  // Mini canvas dimensioning
  const canvasWidth = 320;
  const canvasHeight = 64;
  const maxCount = Math.max(1, ...activityData.map((d) => d.count));

  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return { bg: isDark ? '#143825' : '#ECFDF5', text: '#10B981', border: '#059669' };
      case 'PAYMENT':
        return { bg: isDark ? '#2D1F42' : '#F5F3FF', text: '#8B5CF6', border: '#7C3AED' };
      case 'UPDATE':
        return { bg: isDark ? '#3D280B' : '#FFFBEB', text: '#F59E0B', border: '#D97706' };
      case 'DELETE':
        return { bg: isDark ? '#3A1418' : '#FEF2F2', text: '#EF4444', border: '#DC2626' };
      default:
        return { bg: dynamicColors.surfaceMuted, text: dynamicColors.ink, border: dynamicColors.border };
    }
  };

  const formatDateDisplay = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const isDateField = (key: string, val: any) => {
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return true;
    const lowerKey = key.toLowerCase();
    return (
      lowerKey.includes('date') ||
      lowerKey.includes('time') ||
      lowerKey.includes('on') ||
      lowerKey.includes('at')
    );
  };

  return (
    <Card
      variant="surface"
      style={[
        styles.containerCard,
        { backgroundColor: dynamicColors.surface, borderColor: dynamicColors.border, borderWidth: 1 },
      ]}
    >
      {/* Title & DB Indicator with dedicated break & cut-off tab */}
      <View style={styles.headerContainer}>
        <View style={styles.titleWithIcon}>
          <Ionicons name="shield-checkmark" size={20} color={dynamicColors.primary} />
          <Text style={[styles.sectionTitle, { color: dynamicColors.headingPrimary }]}>
            Live Database Audit Logs
          </Text>
        </View>
        <View style={styles.cutOffTabRow}>
          <View
            style={[
              styles.dbLivePill,
              {
                backgroundColor: isDark ? '#133522' : '#DCFCE7',
                borderColor: isDark ? '#1F5132' : '#BBF7D0',
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.greenDot} />
            <Text style={[styles.dbLiveText, { color: isDark ? '#34D399' : '#15803D' }]}>
              {logs.length} DB Records
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionSub, { color: dynamicColors.textSecondary }]}>
        Tamper-evident system log tracking disbursements, collections, KYC, and required dates
      </Text>

      {/* Mini Canvas: 7-Day Audit Activity Heatmap */}
      <View style={[styles.canvasWrapper, { backgroundColor: isDark ? '#222222' : '#F8FAFC', borderColor: dynamicColors.border }]}>
        <View style={styles.canvasHeader}>
          <Text style={[styles.canvasTitle, { color: dynamicColors.textSecondary }]}>
            7-Day Activity Density Canvas
          </Text>
          <Text style={[styles.canvasSubtitle, { color: dynamicColors.textTertiary }]}>
            Peak: {maxCount} events/day
          </Text>
        </View>

        <View style={styles.svgContainer}>
          <Svg width="100%" height={canvasHeight} viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
            {/* Horizontal baseline */}
            <Line
              x1="0"
              y1={canvasHeight - 16}
              x2={canvasWidth}
              y2={canvasHeight - 16}
              stroke={dynamicColors.border}
              strokeWidth="1"
            />

            {activityData.map((d, index) => {
              const barWidth = 28;
              const gap = (canvasWidth - barWidth * activityData.length) / (activityData.length + 1);
              const x = gap + index * (barWidth + gap);
              const maxBarHeight = canvasHeight - 26;
              const barHeight = Math.max(4, (d.count / maxCount) * maxBarHeight);
              const y = canvasHeight - 16 - barHeight;

              const isPeak = d.count === maxCount && d.count > 0;
              const barColor = isPeak ? dynamicColors.primary : (isDark ? '#4F46E5' : '#818CF8');

              return (
                <G key={d.dateStr}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx="4"
                    fill={barColor}
                    opacity={d.count > 0 ? 0.9 : 0.25}
                  />
                  {d.count > 0 && (
                    <SvgText
                      x={x + barWidth / 2}
                      y={y - 2}
                      textAnchor="middle"
                      fontSize="9"
                      fontFamily="Polymath"
                      letterSpacing="0.8"
                      fill={dynamicColors.ink}
                    >
                      {d.count}
                    </SvgText>
                  )}
                  <SvgText
                    x={x + barWidth / 2}
                    y={canvasHeight - 4}
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="PolymathThin"
                    letterSpacing="0.6"
                    fill={dynamicColors.textSecondary}
                  >
                    {d.label.split(' ')[0]}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>
      </View>

      {/* Search Bar with Typo-Tolerance */}
      <View style={[styles.searchBar, { backgroundColor: isDark ? '#2A2A2A' : '#F1F1F5', borderColor: dynamicColors.border }]}>
        <Ionicons name="search-outline" size={18} color={dynamicColors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: dynamicColors.ink }]}
          placeholder="Search records, keys, names, dates (e.g. karthk, paymnt)..."
          placeholderTextColor={dynamicColors.textTertiary}
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={dynamicColors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {searchQuery.length > 0 && (
        <View style={styles.searchResultBadgeRow}>
          <Text style={[styles.searchCountText, { color: dynamicColors.textSecondary }]}>
            Found <Text style={{ color: dynamicColors.primary, fontWeight: 'bold' }}>{filteredLogs.length}</Text> matches (typo-tolerant search)
          </Text>
        </View>
      )}

      {/* Log Items List */}
      <View style={styles.logsList}>
        {paginatedLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={36} color={dynamicColors.textTertiary} />
            <Text style={[styles.emptyText, { color: dynamicColors.textSecondary }]}>
              {searchQuery ? `No matching audit records found for "${searchQuery}"` : 'No audit records in database yet.'}
            </Text>
          </View>
        ) : (
          paginatedLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const badgeColor = getActionBadgeColor(log.action);

            return (
              <View
                key={log.id}
                style={[
                  styles.logItemContainer,
                  { backgroundColor: isDark ? '#272727' : '#FFFFFF', borderColor: dynamicColors.border },
                ]}
              >
                {/* Header Row */}
                <TouchableOpacity
                  onPress={() => toggleExpand(log.id)}
                  activeOpacity={0.7}
                  style={styles.logHeaderClickable}
                >
                  <View style={styles.logHeaderLeft}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.actionBadge, { backgroundColor: badgeColor.bg, borderColor: badgeColor.border }]}>
                        <Text style={[styles.actionBadgeText, { color: badgeColor.text }]}>
                          {log.action}
                        </Text>
                      </View>
                      <View style={[styles.entityBadge, { backgroundColor: dynamicColors.surfaceMuted }]}>
                        <Text style={[styles.entityBadgeText, { color: dynamicColors.textSecondary }]}>
                          {log.entityType}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.logSummaryText, { color: dynamicColors.ink }]} numberOfLines={isExpanded ? undefined : 2}>
                      {log.summary || `Event on ${log.entityType} (${log.entityId})`}
                    </Text>

                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={12} color={dynamicColors.textTertiary} />
                      <Text style={[styles.timestampText, { color: dynamicColors.textTertiary }]}>
                        {formatDateDisplay(log.timestamp)}
                      </Text>
                      <Text style={[styles.whoDot, { color: dynamicColors.textTertiary }]}>•</Text>
                      <Ionicons name="person-circle-outline" size={12} color={dynamicColors.textTertiary} />
                      <Text style={[styles.whoText, { color: dynamicColors.textTertiary }]}>
                        {log.who}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.logHeaderRight}>
                    <Ionicons
                      name={isExpanded ? 'chevron-up-circle' : 'chevron-down-circle-outline'}
                      size={22}
                      color={isExpanded ? dynamicColors.primary : dynamicColors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Enormous Data Logs Keys & Dates Viewer */}
                {isExpanded && (
                  <View style={[styles.expandedDrawer, { backgroundColor: isDark ? '#1F1F1F' : '#F8FAFC', borderTopColor: dynamicColors.border }]}>
                    <View style={styles.drawerTitleRow}>
                      <Ionicons name="code-working" size={16} color={dynamicColors.primary} />
                      <Text style={[styles.drawerTitle, { color: dynamicColors.headingPrimary }]}>
                        Recorded DB Data Keys & Required Field Dates
                      </Text>
                    </View>

                    {/* After state / Recorded payload */}
                    {log.after && (
                      <View style={styles.keysSection}>
                        <Text style={[styles.keysSectionHeading, { color: dynamicColors.textSecondary }]}>
                          STATE KEYS (AFTER):
                        </Text>
                        <View style={styles.keysGrid}>
                          {Object.entries(log.after).map(([k, v]) => {
                            const isDate = isDateField(k, v);
                            const displayVal = typeof v === 'object' ? JSON.stringify(v) : String(v);

                            return (
                              <View
                                key={k}
                                style={[
                                  styles.keyChip,
                                  { backgroundColor: isDark ? '#2D2D2D' : '#FFFFFF', borderColor: isDate ? dynamicColors.primary : dynamicColors.border },
                                  isDate && styles.dateHighlightChip,
                                ]}
                              >
                                <Text style={[styles.keyName, { color: isDate ? dynamicColors.primaryDark : dynamicColors.textSecondary }]}>
                                  {k}:
                                </Text>
                                <Text style={[styles.keyValue, { color: dynamicColors.ink }]} numberOfLines={2}>
                                  {displayVal}
                                </Text>
                                {isDate && (
                                  <View style={[styles.dateIndicatorBadge, { backgroundColor: dynamicColors.primarySoft }]}>
                                    <Ionicons name="calendar" size={10} color={dynamicColors.primaryDark} />
                                    <Text style={[styles.dateIndicatorText, { color: dynamicColors.primaryDark }]}>DATE</Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    {/* Before state (if update) */}
                    {log.before && Object.keys(log.before).length > 0 && (
                      <View style={styles.keysSection}>
                        <Text style={[styles.keysSectionHeading, { color: dynamicColors.textSecondary }]}>
                          PREVIOUS STATE (BEFORE):
                        </Text>
                        <View style={styles.keysGrid}>
                          {Object.entries(log.before).map(([k, v]) => (
                            <View
                              key={k}
                              style={[
                                styles.keyChip,
                                { backgroundColor: isDark ? '#2D2D2D' : '#FFFFFF', borderColor: dynamicColors.border },
                              ]}
                            >
                              <Text style={[styles.keyName, { color: dynamicColors.textSecondary }]}>{k}:</Text>
                              <Text style={[styles.keyValue, { color: dynamicColors.textMuted }]}>
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Metadata & Audit Trail */}
                    {log.metadata && (
                      <View style={styles.keysSection}>
                        <Text style={[styles.keysSectionHeading, { color: dynamicColors.textSecondary }]}>
                          SYSTEM METADATA:
                        </Text>
                        <View style={styles.keysGrid}>
                          {Object.entries(log.metadata).map(([k, v]) => (
                            <View
                              key={k}
                              style={[
                                styles.keyChip,
                                { backgroundColor: isDark ? '#2D2D2D' : '#FFFFFF', borderColor: dynamicColors.border },
                              ]}
                            >
                              <Text style={[styles.keyName, { color: dynamicColors.textSecondary }]}>{k}:</Text>
                              <Text style={[styles.keyValue, { color: dynamicColors.ink }]}>{String(v)}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Pagination Controls */}
      <View style={[styles.paginationRow, { borderTopColor: dynamicColors.border }]}>
        <Text style={[styles.pageInfoText, { color: dynamicColors.textSecondary }]}>
          Page {validCurrentPage} of {totalPages} ({filteredLogs.length} logs)
        </Text>

        <View style={styles.paginationButtons}>
          <TouchableOpacity
            onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={validCurrentPage <= 1}
            style={[
              styles.pageBtn,
              { backgroundColor: dynamicColors.surfaceMuted, borderColor: dynamicColors.border },
              validCurrentPage <= 1 && styles.pageBtnDisabled,
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={16}
              color={validCurrentPage <= 1 ? dynamicColors.textTertiary : dynamicColors.ink}
            />
            <Text
              style={[
                styles.pageBtnText,
                { color: validCurrentPage <= 1 ? dynamicColors.textTertiary : dynamicColors.ink },
              ]}
            >
              Prev
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={validCurrentPage >= totalPages}
            style={[
              styles.pageBtn,
              { backgroundColor: dynamicColors.surfaceMuted, borderColor: dynamicColors.border },
              validCurrentPage >= totalPages && styles.pageBtnDisabled,
            ]}
          >
            <Text
              style={[
                styles.pageBtnText,
                { color: validCurrentPage >= totalPages ? dynamicColors.textTertiary : dynamicColors.ink },
              ]}
            >
              Next
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={validCurrentPage >= totalPages ? dynamicColors.textTertiary : dynamicColors.ink}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  containerCard: {
    padding: 16,
    borderRadius: radii.card,
    marginVertical: 12,
  },
  headerContainer: {
    marginBottom: 6,
    gap: 6,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...typography.subheading,
    fontFamily: typography.fontHeadline,
    fontSize: 16,
    letterSpacing: 0.8,
  },
  cutOffTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  dbLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  dbLiveText: {
    fontFamily: typography.fontPolymath,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  sectionSub: {
    ...typography.caption,
    fontFamily: typography.fontBody,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  canvasWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  canvasTitle: {
    ...typography.captionMedium,
    fontSize: 11,
    fontWeight: '600',
  },
  canvasSubtitle: {
    ...typography.caption,
    fontSize: 10,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 13,
    padding: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  searchResultBadgeRow: {
    marginBottom: 8,
  },
  searchCountText: {
    ...typography.caption,
    fontSize: 11,
  },
  logsList: {
    gap: 8,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
  },
  logItemContainer: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  logHeaderClickable: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  logHeaderRight: {
    marginLeft: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  entityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  entityBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  logSummaryText: {
    ...typography.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timestampText: {
    ...typography.caption,
    fontSize: 11,
  },
  whoDot: {
    marginHorizontal: 2,
  },
  whoText: {
    ...typography.caption,
    fontSize: 11,
  },
  expandedDrawer: {
    borderTopWidth: 1,
    padding: 12,
    gap: 10,
  },
  drawerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  drawerTitle: {
    ...typography.captionMedium,
    fontWeight: '700',
    fontSize: 12,
  },
  keysSection: {
    gap: 4,
  },
  keysSectionHeading: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  keysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keyChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateHighlightChip: {
    borderWidth: 1.5,
  },
  keyName: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  keyValue: {
    ...typography.captionMedium,
    fontSize: 11,
  },
  dateIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  dateIndicatorText: {
    fontSize: 8,
    fontWeight: '800',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  pageInfoText: {
    ...typography.caption,
    fontSize: 11,
  },
  paginationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    ...typography.captionMedium,
    fontSize: 11,
  },
});
