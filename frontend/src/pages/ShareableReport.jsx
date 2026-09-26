import React from 'react';
import { Page, Text, View, Document, StyleSheet, Link } from '@react-pdf/renderer';

// styles for the PDF document
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: 'hsl(236, 25%, 8%)',
    color: 'hsl(45, 35%, 95%)', 
    padding: 35,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 25,
  },
  title: {
    fontSize: 25,
    fontFamily: 'Helvetica-Bold',
    color: 'hsl(210, 85%, 65%)', 
  },
  subtitle: {
    fontSize: 12,
    color: 'hsl(45, 10%, 65%)', 
  },
  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'hsl(236, 20%, 12%)',
    borderWidth: 1,
    borderColor: 'hsl(236, 15%, 25%)',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginHorizontal: 5,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
  },
  statLabel: {
    fontSize: 10,
    color: 'hsl(45, 10%, 65%)',
    marginTop: 2,
  },
  // Section container
  section: {
    backgroundColor: 'hsl(236, 20%, 12%)',
    borderWidth: 1,
    borderColor: 'hsl(236, 15%, 25%)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 10,
    fontFamily: 'Helvetica-Bold',
    color: 'hsl(260, 70%, 70%)', 
  },
  // Two-column layout for tables
  columnLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: '48%',
  },
  // Table Styles
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'hsl(260, 70%, 70%)',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  tableRowAlternate: {
    backgroundColor: 'hsl(236, 15%, 20%)', 
    borderRadius: 3,
  },
  colHeader: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  tableCell: {
    fontSize: 9,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 35,
    right: 35,
    textAlign: 'center',
    fontSize: 9,
    color: 'hsl(45, 10%, 65%)',
  },
  brandText: {
    color: 'hsl(210, 85%, 65%)',
    textDecoration: 'none',
  }
});

// The PDF Document Component
const ReportDocument = ({ data }) => {
    if (!data || !data.stats) return null;
    
    const { userName, medicines, stats } = data;
    const { overview, daily, meds, adherenceData } = stats;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.title}>Wellness Progress Report</Text>
                    <Text style={styles.subtitle}>Prepared for: {userName}</Text>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}><Text style={[styles.statValue, { color: '#4ade80' }]}>{overview?.totals?.taken ?? 0}</Text><Text style={styles.statLabel}>Doses Taken</Text></View>
                    <View style={styles.statCard}><Text style={[styles.statValue, { color: '#facc15' }]}>{overview?.totals?.missed ?? 0}</Text><Text style={styles.statLabel}>Doses Missed</Text></View>
                    <View style={styles.statCard}><Text style={[styles.statValue, { color: '#60a5fa' }]}>{overview?.adherence?.toFixed(1) ?? 0}%</Text><Text style={styles.statLabel}>Adherence</Text></View>
                    <View style={styles.statCard}><Text style={[styles.statValue, { color: '#a78bfa' }]}>{medicines?.length ?? 0}</Text><Text style={styles.statLabel}>Active Meds</Text></View>
                </View>

                {/* Medication Schedule */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Current Medication Schedule</Text>
                  {medicines.map((medicine, index) => (
                      <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                          <Text style={[styles.tableCell, { flex: 2, fontFamily: 'Helvetica-Bold' }]}>{medicine.pillName}</Text>
                          <Text style={[styles.tableCell, { flex: 2 }]}>Dosage: {medicine.dosage}</Text>
                          <Text style={[styles.tableCell, { flex: 3 }]}>Times: {medicine.times.join(', ')}</Text>
                      </View>
                  ))}
                </View>

                {/* Data Tables in a Two-Column Layout */}
                <View style={styles.columnLayout}>
                  <View style={styles.column}>
                      <View style={styles.section}>
                          <Text style={styles.sectionTitle}>Daily Doses</Text>
                          <View style={styles.table}>
                              <View style={styles.tableHeader}>
                                  <Text style={[styles.colHeader, { width: '50%' }]}>Date</Text>
                                  <Text style={[styles.colHeader, { width: '25%', textAlign: 'center' }]}>Taken</Text>
                                  <Text style={[styles.colHeader, { width: '25%', textAlign: 'center' }]}>Missed</Text>
                              </View>
                              {daily.map((day, index) => (
                                  <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                                      <Text style={[styles.tableCell, { width: '50%' }]}>{day.date}</Text>
                                      <Text style={[styles.tableCell, { width: '25%', textAlign: 'center' }]}>{day.taken}</Text>
                                      <Text style={[styles.tableCell, { width: '25%', textAlign: 'center' }]}>{day.missed}</Text>
                                  </View>
                              ))}
                          </View>
                      </View>
                  </View>

                  <View style={styles.column}>
                      <View style={styles.section}>
                          <Text style={styles.sectionTitle}>Adherence Trend</Text>
                          <View style={styles.table}>
                              <View style={styles.tableHeader}>
                                  <Text style={[styles.colHeader, { width: '60%' }]}>Date</Text>
                                  <Text style={[styles.colHeader, { width: '40%', textAlign: 'right' }]}>Adherence</Text>
                              </View>
                              {adherenceData.map((item, index) => (
                                  <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                                      <Text style={[styles.tableCell, { width: '60%' }]}>{item.date}</Text>
                                      <Text style={[styles.tableCell, { width: '40%', textAlign: 'right' }]}>{item.adherence}%</Text>
                                  </View>
                              ))}
                          </View>
                      </View>
                  </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Per-Medication Performance</Text>
                    <View style={styles.table}>
                         <View style={styles.tableHeader}>
                            <Text style={[styles.colHeader, { width: '50%' }]}>Medication</Text>
                            <Text style={[styles.colHeader, { width: '25%', textAlign: 'center' }]}>Taken</Text>
                            <Text style={[styles.colHeader, { width: '25%', textAlign: 'center' }]}>Missed</Text>
                        </View>
                        {meds.map((med, index) => (
                            <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
                                <Text style={[styles.tableCell, { width: '50%' }]}>{med.id}</Text>
                                <Text style={[styles.tableCell, { width: '25%', textAlign: 'center' }]}>{med.taken}</Text>
                                <Text style={[styles.tableCell, { width: '25%', textAlign: 'center' }]}>{med.missed}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => (
                    `Page ${pageNumber} of ${totalPages}  |  Generated by MedKnock`
                )} />
            </Page>
        </Document>
    );
};

export default ReportDocument;