import Attendance from '../model/Attendance.js';
import Asset from '../model/Asset.js';
import Project from '../model/Project.js';
import Leave from '../model/Leave.js';
import Task from '../model/Task.js';
import Timesheet from '../model/Timesheet.js';
export const getUnifiedReports = async (req, res) => {
    try {
        const { tab = 'attendance', role = 'all', dateRange = 'week', page = '1', limit = '50', search = '', startDate, endDate, department, status } = req.query;
        console.log('📊 Reports query:', { tab, dateRange, startDate, endDate, page, limit, search, department, status });
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const pageSize = parseInt(limit);
        // Build date filter
        const now = new Date();
        let dateFilter = {};
        if (startDate && endDate) {
            // Custom date range
            dateFilter = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        else {
            // Preset date ranges
            switch (dateRange) {
                case 'today':
                    const today = new Date(now);
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    dateFilter = { $gte: today, $lt: tomorrow };
                    break;
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - 6);
                    weekStart.setHours(0, 0, 0, 0);
                    const weekEnd = new Date(now);
                    weekEnd.setHours(23, 59, 59, 999);
                    dateFilter = { $gte: weekStart, $lte: weekEnd };
                    break;
                case 'month':
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                    dateFilter = { $gte: monthStart, $lte: monthEnd };
                    break;
                case 'all':
                    dateFilter = {};
                    break;
            }
        }
        // Model and field configuration
        let Model;
        let dateField = 'createdAt';
        let searchFields = ['name'];
        let populateFields = [];
        switch (tab) {
            case 'attendance':
                Model = Attendance;
                dateField = 'date';
                searchFields = ['employee.name', 'department'];
                populateFields = [
                    { path: 'employee', select: 'name department designation' }
                ];
                break;
            case 'projects':
                Model = Project;
                dateField = 'createdAt';
                searchFields = ['name', 'description'];
                populateFields = [
                    { path: 'assignedEmployees', select: 'name department' },
                    { path: 'createdBy', select: 'name' }
                ];
                break;
            case 'tasks':
                Model = Task;
                dateField = 'createdAt';
                searchFields = ['task_title', 'description'];
                populateFields = [
                    { path: 'assigned_to', select: 'name department' },
                    { path: 'assigned_by', select: 'name' },
                    { path: 'project_id', select: 'name' }
                ];
                break;
            case 'leaves':
                Model = Leave;
                dateField = 'createdAt';
                searchFields = ['reason', 'leaveType'];
                populateFields = [
                    { path: 'employeeId', select: 'name department' },
                    { path: 'approvedBy', select: 'name' }
                ];
                break;
            case 'timesheets':
                Model = Timesheet;
                dateField = 'date';
                searchFields = ['work_description'];
                populateFields = [
                    { path: 'employee_id', select: 'name department' },
                    { path: 'project_id', select: 'name' },
                    { path: 'task_id', select: 'task_title' }
                ];
                break;
            case 'assets':
                Model = Asset;
                dateField = 'createdAt';
                searchFields = ['name', 'serialNumber', 'category'];
                populateFields = [
                    { path: 'assignedTo', select: 'name department' }
                ];
                break;
            default:
                Model = Attendance;
                dateField = 'date';
                populateFields = [
                    { path: 'employee', select: 'name department' }
                ];
        }
        // Build match query
        const matchQuery = { deletedAt: null };
        // Add date filter
        if (Object.keys(dateFilter).length > 0) {
            matchQuery[dateField] = dateFilter;
        }
        // Add search filter
        if (search && search.trim()) {
            const searchRegex = { $regex: search.trim(), $options: 'i' };
            if (tab === 'attendance') {
                matchQuery.$or = [
                    { 'employee.name': searchRegex },
                    { department: searchRegex }
                ];
            }
            else if (tab === 'projects') {
                matchQuery.$or = [
                    { name: searchRegex },
                    { description: searchRegex }
                ];
            }
            else if (tab === 'tasks') {
                matchQuery.$or = [
                    { task_title: searchRegex },
                    { description: searchRegex }
                ];
            }
            else if (tab === 'leaves') {
                matchQuery.$or = [
                    { reason: searchRegex },
                    { leaveType: searchRegex }
                ];
            }
            else if (tab === 'timesheets') {
                matchQuery.$or = [
                    { work_description: searchRegex }
                ];
            }
            else if (tab === 'assets') {
                matchQuery.$or = [
                    { name: searchRegex },
                    { serialNumber: searchRegex },
                    { category: searchRegex }
                ];
            }
        }
        // Add department filter
        if (department && department !== 'All') {
            if (tab === 'attendance') {
                matchQuery.department = department;
            }
            else if (tab === 'projects') {
                // For projects, we might need to filter by team member departments
                matchQuery['assignedEmployees.department'] = department;
            }
        }
        // Add status filter
        if (status && status !== 'All') {
            matchQuery.status = status;
        }
        console.log('🔍 Match query:', JSON.stringify(matchQuery, null, 2));
        // Execute aggregation for data, stats, and charts
        const aggregationPipeline = [
            { $match: matchQuery },
            {
                $facet: {
                    // Main data with pagination
                    data: [
                        { $sort: { [dateField]: -1 } },
                        { $skip: skip },
                        { $limit: pageSize }
                    ],
                    // Total count for pagination
                    totalCount: [
                        { $count: 'count' }
                    ],
                    // Stats aggregation
                    stats: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                statusBreakdown: {
                                    $push: '$status'
                                }
                            }
                        }
                    ],
                    // Chart data - status distribution
                    chartData: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 }
                            }
                        },
                        {
                            $project: {
                                name: '$_id',
                                value: '$count',
                                _id: 0
                            }
                        }
                    ]
                }
            }
        ];
        const results = await Model.aggregate(aggregationPipeline);
        // Populate the data results
        let populatedData = results[0].data;
        if (populateFields.length > 0) {
            populatedData = await Model.populate(results[0].data, populateFields);
        }
        // Calculate stats
        const totalCount = results[0].totalCount[0]?.count || 0;
        const statsData = results[0].stats[0];
        const chartData = results[0].chartData || [];
        // Build comprehensive stats
        const stats = {
            total: totalCount,
            totalEmployees: tab === 'attendance' ? totalCount : undefined,
            totalProjects: tab === 'projects' ? totalCount : undefined,
            totalTasks: tab === 'tasks' ? totalCount : undefined,
            totalLeaves: tab === 'leaves' ? totalCount : undefined,
            totalTimesheets: tab === 'timesheets' ? totalCount : undefined,
            totalAssets: tab === 'assets' ? totalCount : undefined,
            ...getTabSpecificStats(populatedData, tab)
        };
        console.log('📈 Results:', {
            dataCount: populatedData.length,
            totalCount,
            chartDataPoints: chartData.length,
            stats
        });
        res.json({
            success: true,
            data: populatedData,
            stats,
            chartData,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / pageSize),
                totalRecords: totalCount,
                limit: pageSize
            }
        });
    }
    catch (error) {
        console.error('💥 Reports API Error:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
// Helper function to calculate tab-specific stats
function getTabSpecificStats(data, tab) {
    if (!data || data.length === 0)
        return {};
    switch (tab) {
        case 'attendance':
            const presentCount = data.filter(item => item.status === 'Present').length;
            const absentCount = data.filter(item => item.status === 'Absent').length;
            const lateCount = data.filter(item => item.status === 'Late').length;
            return {
                presentToday: presentCount,
                absentToday: absentCount,
                lateToday: lateCount
            };
        case 'projects':
            const activeProjects = data.filter(item => item.status === 'Active').length;
            const completedProjects = data.filter(item => item.status === 'Completed').length;
            const onHoldProjects = data.filter(item => item.status === 'On Hold').length;
            return {
                activeProjects,
                completedProjects,
                onHoldProjects
            };
        case 'tasks':
            const todoTasks = data.filter(item => item.status === 'TODO').length;
            const inProgressTasks = data.filter(item => item.status === 'IN_PROGRESS').length;
            const completedTasks = data.filter(item => item.status === 'COMPLETED').length;
            const blockedTasks = data.filter(item => item.status === 'BLOCKED').length;
            return {
                todoTasks,
                inProgressTasks,
                completedTasks,
                blockedTasks,
                activeTasks: inProgressTasks
            };
        case 'leaves':
            const pendingLeaves = data.filter(item => item.status === 'Pending').length;
            const approvedLeaves = data.filter(item => item.status === 'Approved').length;
            const rejectedLeaves = data.filter(item => item.status === 'Rejected').length;
            return {
                pendingLeaves,
                approvedLeaves,
                rejectedLeaves
            };
        case 'timesheets':
            const submittedTimesheets = data.filter(item => item.status === 'SUBMITTED').length;
            const approvedTimesheets = data.filter(item => item.status === 'APPROVED').length;
            const rejectedTimesheets = data.filter(item => item.status === 'REJECTED').length;
            const totalHours = data.reduce((sum, item) => sum + (item.hours_worked || 0), 0);
            return {
                submittedTimesheets,
                approvedTimesheets,
                rejectedTimesheets,
                pendingTimesheets: submittedTimesheets,
                totalHours
            };
        case 'assets':
            const availableAssets = data.filter(item => item.status === 'Available').length;
            const assignedAssets = data.filter(item => item.status === 'Assigned').length;
            const maintenanceAssets = data.filter(item => item.status === 'Maintenance').length;
            return {
                availableAssets,
                assignedAssets,
                maintenanceAssets
            };
        default:
            return {};
    }
}
//# sourceMappingURL=reportsController-fixed.js.map