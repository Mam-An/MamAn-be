import prisma from '../src/utils/prisma.js';
const DEFINITIONS = [
    {
        slug: 'tc_first_water', emoji: '💧', title: 'Giọt nước đầu tiên',
        description: 'Lần đầu tiên bạn chăm sóc cây',
        category: 'TREE_CARE' as const,
        requirement: 'Chăm sóc cây 1 lần',
        progressKey: 'carePlantCount', targetProgress: 1, sortOrder: 10,
    },
    {
        slug: 'tc_care_10', emoji: '🌿', title: 'Người làm vườn nhỏ',
        description: 'Kiên trì chăm sóc cây qua 10 lần',
        category: 'TREE_CARE' as const,
        requirement: 'Chăm sóc cây 10 lần',
        progressKey: 'carePlantCount', targetProgress: 10, sortOrder: 11,
    },
    {
        slug: 'tc_care_30', emoji: '🌳', title: 'Bàn tay xanh',
        description: 'Đã dành 30 lần yêu thương cho khu vườn',
        category: 'TREE_CARE' as const,
        requirement: 'Chăm sóc cây 30 lần',
        progressKey: 'carePlantCount', targetProgress: 30, sortOrder: 12,
    },
    {
        slug: 'tc_care_100', emoji: '🌲', title: 'Người thầy của cây',
        description: 'Một trăm lần đồng hành cùng mảnh vườn nhỏ',
        category: 'TREE_CARE' as const,
        requirement: 'Chăm sóc cây 100 lần',
        progressKey: 'carePlantCount', targetProgress: 100, sortOrder: 13,
    },
    {
        slug: 'tc_care_200', emoji: '🌻', title: 'Bậc thầy làm vườn',
        description: 'Hơn 200 lần tận tụy chăm sóc những mầm xanh',
        category: 'TREE_CARE' as const,
        requirement: 'Chăm sóc cây 200 lần',
        progressKey: 'carePlantCount', targetProgress: 200, sortOrder: 13,
    },
    {
        slug: 'tc_resource_5', emoji: '🌾', title: 'Người nông dân tập sự',
        description: 'Đã bón tài nguyên cho cây 5 lần',
        category: 'TREE_CARE' as const,
        requirement: 'Bón tài nguyên 5 lần',
        progressKey: 'resourceFeedCount', targetProgress: 5, sortOrder: 14,
    },
    {
        slug: 'tc_resource_20', emoji: '🧑‍🌾', title: 'Người nông dân thực thụ',
        description: 'Đã bón đủ loại tài nguyên 20 lần',
        category: 'TREE_CARE' as const,
        requirement: 'Bón tài nguyên 20 lần',
        progressKey: 'resourceFeedCount', targetProgress: 20, sortOrder: 15,
    },
    {
        slug: 'wl_first_zen', emoji: '🌱', title: 'Hạt giống bình yên',
        description: 'Hoàn thành phiên Vườn Yên đầu tiên',
        category: 'WELLNESS' as const,
        requirement: 'Hoàn thành 1 phiên Vườn Yên',
        progressKey: 'zenSessionCount', targetProgress: 1, sortOrder: 20,
    },
    {
        slug: 'wl_zen_5', emoji: '🍃', title: 'Khoảng lặng quen thuộc',
        description: 'Đã thực hành Vườn Yên 5 lần',
        category: 'WELLNESS' as const,
        requirement: 'Hoàn thành 5 phiên Vườn Yên',
        progressKey: 'zenSessionCount', targetProgress: 5, sortOrder: 21,
    },
    {
        slug: 'wl_zen_20', emoji: '🧘', title: 'Người thực hành',
        description: 'Kiên trì thực hành qua 20 phiên Vườn Yên',
        category: 'WELLNESS' as const,
        requirement: 'Hoàn thành 20 phiên Vườn Yên',
        progressKey: 'zenSessionCount', targetProgress: 20, sortOrder: 22,
    },
    {
        slug: 'wl_zen_50', emoji: '🌸', title: 'Khu vườn trong tâm trí',
        description: 'Đã dành 50 phiên thư giãn cùng Vườn Yên',
        category: 'WELLNESS' as const,
        requirement: 'Hoàn thành 50 phiên Vườn Yên',
        progressKey: 'zenSessionCount', targetProgress: 50, sortOrder: 23,
    },
    {
        slug: 'wl_zen_100', emoji: '🪷', title: 'Chánh niệm sâu sắc',
        description: 'Đạt mốc 100 phiên tịnh tâm, thấu hiểu chính mình',
        category: 'WELLNESS' as const,
        requirement: 'Hoàn thành 100 phiên Vườn Yên',
        progressKey: 'zenSessionCount', targetProgress: 100, sortOrder: 23,
    },
    {
        slug: 'wl_minutes_60', emoji: '⏳', title: 'Một giờ bình yên',
        description: 'Tích lũy đủ 60 phút thư giãn cùng cây',
        category: 'WELLNESS' as const,
        requirement: 'Tích lũy 60 phút thư giãn',
        progressKey: 'zenTotalMinutes', targetProgress: 60, sortOrder: 24,
    },
    {
        slug: 'wl_minutes_300', emoji: '🌙', title: 'Người bạn của sự yên tĩnh',
        description: 'Đã dành 300 phút sống chậm cùng khu vườn',
        category: 'WELLNESS' as const,
        requirement: 'Tích lũy 300 phút thư giãn',
        progressKey: 'zenTotalMinutes', targetProgress: 300, sortOrder: 25,
    },
    {
        slug: 'jn_first', emoji: '✨', title: 'Lắng nghe bản thân',
        description: 'Lần đầu tiên ghi lại cảm xúc của mình',
        category: 'JOURNAL' as const,
        requirement: 'Viết 1 nhật ký',
        progressKey: 'journalCount', targetProgress: 1, sortOrder: 30,
    },
    {
        slug: 'jn_7', emoji: '📝', title: 'Người viết nhật ký',
        description: 'Đã ghi lại 7 khoảnh khắc cảm xúc',
        category: 'JOURNAL' as const,
        requirement: 'Viết 7 nhật ký',
        progressKey: 'journalCount', targetProgress: 7, sortOrder: 31,
    },
    {
        slug: 'jn_30', emoji: '📖', title: 'Người quan sát nội tâm',
        description: 'Kiên trì viết 30 trang nhật ký',
        category: 'JOURNAL' as const,
        requirement: 'Viết 30 nhật ký',
        progressKey: 'journalCount', targetProgress: 30, sortOrder: 32,
    },
    {
        slug: 'jn_100', emoji: '📚', title: 'Người ghi chép kỷ niệm',
        description: '100 trang nhật ký của những vui buồn đã qua',
        category: 'JOURNAL' as const,
        requirement: 'Viết 100 nhật ký',
        progressKey: 'journalCount', targetProgress: 100, sortOrder: 32,
    },
    {
        slug: 'jn_days_7', emoji: '🌅', title: 'Một tuần ghi nhận',
        description: 'Ghi nhận cảm xúc trong 7 ngày khác nhau',
        category: 'JOURNAL' as const,
        requirement: 'Ghi nhật ký trong 7 ngày',
        progressKey: 'journalDays', targetProgress: 7, sortOrder: 33,
    },
    {
        slug: 'jn_days_30', emoji: '🌻', title: 'Người bạn đồng hành cảm xúc',
        description: 'Đã ghi nhận cảm xúc trong 30 ngày',
        category: 'JOURNAL' as const,
        requirement: 'Ghi nhật ký trong 30 ngày',
        progressKey: 'journalDays', targetProgress: 30, sortOrder: 34,
    },
    {
        slug: 'jn_days_100', emoji: '💌', title: 'Người bạn tâm giao',
        description: 'Đã ghi nhận cảm xúc trong 100 ngày',
        category: 'JOURNAL' as const,
        requirement: 'Ghi nhật ký trong 100 ngày',
        progressKey: 'journalDays', targetProgress: 100, sortOrder: 35,
    },
    {
        slug: 'jy_streak_3', emoji: '🌤', title: 'Ba ngày đầu tiên',
        description: 'Đồng hành cùng khu vườn 3 ngày liên tiếp',
        category: 'JOURNEY' as const,
        requirement: 'Dùng app 3 ngày liên tiếp',
        progressKey: 'streakDays', targetProgress: 3, sortOrder: 40,
    },
    {
        slug: 'jy_streak_7', emoji: '⭐', title: 'Một tuần đồng hành',
        description: 'Đã không bỏ lỡ một ngày nào trong tuần',
        category: 'JOURNEY' as const,
        requirement: 'Dùng app 7 ngày liên tiếp',
        progressKey: 'streakDays', targetProgress: 7, sortOrder: 41,
    },
    {
        slug: 'jy_streak_30', emoji: '🌕', title: 'Người bạn đồng hành',
        description: 'Trọn một tháng không rời khu vườn',
        category: 'JOURNEY' as const,
        requirement: 'Dùng app 30 ngày liên tiếp',
        progressKey: 'streakDays', targetProgress: 30, sortOrder: 42,
    },
    {
        slug: 'jy_streak_100', emoji: '🏡', title: 'Khu vườn là nhà',
        description: '100 ngày — khu vườn đã trở thành một phần của bạn',
        category: 'JOURNEY' as const,
        requirement: 'Dùng app 100 ngày liên tiếp',
        progressKey: 'streakDays', targetProgress: 100, sortOrder: 43,
    },
    {
        slug: 'jy_streak_365', emoji: '🌟', title: 'Một năm đáng nhớ',
        description: 'Trải qua 365 ngày đồng hành cùng khu vườn',
        category: 'JOURNEY' as const,
        requirement: 'Dùng app 365 ngày liên tiếp',
        progressKey: 'streakDays', targetProgress: 365, sortOrder: 44,
    },
];
async function main() {
    console.log('🌱 Seeding achievement definitions...');
    for (const def of DEFINITIONS) {
        await prisma.achievementDefinition.upsert({
            where: { slug: def.slug },
            update: {
                title: def.title,
                description: def.description,
                emoji: def.emoji,
                category: def.category,
                requirement: def.requirement,
                progressKey: def.progressKey,
                targetProgress: def.targetProgress,
                sortOrder: def.sortOrder,
            },
            create: def,
        });
    }
    console.log(`✅ Seeded ${DEFINITIONS.length} achievement definitions.`);
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
