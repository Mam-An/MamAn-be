import type { Request, Response } from "express";
import prisma from "../../utils/prisma.js";
import type { CompanionMode } from "../../generated/prisma/index.js";



// ────────────────────────────────────────────────────────────────
// POST /companion/request
// Tạo yêu cầu tìm bạn (USER only, max 1 PENDING request at a time)
// ────────────────────────────────────────────────────────────────
export async function createRequest(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { mode, moodNote, realPlantId, homePlantName, homePlantImageUrl } = req.body as { 
      mode: CompanionMode; moodNote?: string; realPlantId?: string; homePlantName?: string; homePlantImageUrl?: string 
    };

    if (!mode || !["SPONSOR_GROWER", "GROWER_GROWER", "OPEN"].includes(mode)) {
      return res.status(400).json({ message: "mode không hợp lệ (SPONSOR_GROWER | GROWER_GROWER | OPEN)" });
    }

    // Kiểm tra đã có active companionship chưa
    const existingCompanionship = await prisma.companionship.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: "ACTIVE",
      },
    });
    if (existingCompanionship) {
      return res.status(409).json({ message: "Bạn đang có một kết nối cây đang hoạt động" });
    }

    // Kiểm tra đã có PENDING request chưa
    const existingRequest = await prisma.companionRequest.findFirst({
      where: { userId, status: "PENDING" },
    });
    if (existingRequest) {
      return res.status(409).json({ message: "Bạn đã có một yêu cầu đang chờ ghép nối" });
    }

    if (realPlantId) {
      const isOwner = await prisma.virtualPlant.findFirst({
        where: { userId, realPlantId },
      });
      if (!isOwner) {
        return res.status(403).json({ message: "Cây thật không tồn tại hoặc không thuộc sở hữu của bạn" });
      }
    }

    const request = await prisma.companionRequest.create({
      data: { 
        userId, mode, 
        moodNote: moodNote || null, 
        realPlantId: realPlantId || null,
        homePlantName: homePlantName || null,
        homePlantImageUrl: homePlantImageUrl || null,
      },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    return res.status(201).json({ message: "Đã tạo yêu cầu tìm bạn cây", data: request });
  } catch (err) {
    console.error("[companion] createRequest error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// ────────────────────────────────────────────────────────────────
// GET /companion/requests
// Danh sách yêu cầu PENDING (để browse, ẩn request của chính mình)
// Query params: mode, page, limit
// ────────────────────────────────────────────────────────────────
export async function listRequests(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { mode } = req.query as { mode?: CompanionMode };
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    const where = {
      status: "PENDING" as const,
      userId: { not: userId },
      ...(mode ? { mode } : {}),
    };

    const [total, requests] = await Promise.all([
      prisma.companionRequest.count({ where }),
      prisma.companionRequest.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true } },
          realPlant: {
            include: {
              flowerType: { select: { id: true, name: true, imageUrl: true } },
              garden: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      data: requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[companion] listRequests error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// ────────────────────────────────────────────────────────────────
// DELETE /companion/request
// Huỷ yêu cầu đang PENDING của chính mình
// ────────────────────────────────────────────────────────────────
export async function cancelRequest(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const request = await prisma.companionRequest.findFirst({
      where: { userId, status: "PENDING" },
    });
    if (!request) {
      return res.status(404).json({ message: "Không tìm thấy yêu cầu đang chờ" });
    }

    await prisma.companionRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED" },
    });

    return res.json({ message: "Đã huỷ yêu cầu tìm bạn" });
  } catch (err) {
    console.error("[companion] cancelRequest error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// ────────────────────────────────────────────────────────────────
// POST /companion/match/:requestId
// Ghép nối với người có requestId (người chấp nhận = currentUser)
// ────────────────────────────────────────────────────────────────
export async function matchRequest(req: Request, res: Response) {
  try {
    const currentUserId = req.user!.id;
    const { requestId } = req.params as { requestId: string };

    // Kiểm tra request tồn tại và còn PENDING
    const targetRequest = await prisma.companionRequest.findUnique({
      where: { id: requestId as string },
      include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    });

    if (!targetRequest || targetRequest.status !== "PENDING") {
      return res.status(404).json({ message: "Yêu cầu không tồn tại hoặc đã được ghép" });
    }
    if (targetRequest.userId === currentUserId) {
      return res.status(400).json({ message: "Không thể ghép nối với chính mình" });
    }

    // Kiểm tra currentUser không có active companionship
    const myActive = await prisma.companionship.findFirst({
      where: {
        OR: [{ user1Id: currentUserId }, { user2Id: currentUserId }],
        status: "ACTIVE",
      },
    });
    if (myActive) {
      return res.status(409).json({ message: "Bạn đang có một kết nối cây đang hoạt động" });
    }

    // Kiểm tra currentUser không có PENDING request (nếu có thì auto cancel)
    const myPendingRequest = await prisma.companionRequest.findFirst({
      where: { userId: currentUserId, status: "PENDING" },
    });

    // Transaction: tạo Companionship + cập nhật cả 2 requests
    const [companionship] = await prisma.$transaction(async (tx) => {
      const newCompanionship = await tx.companionship.create({
        data: {
          user1Id: targetRequest.userId,
          user2Id: currentUserId,
          mode: targetRequest.mode,
          status: "ACTIVE",
        },
        include: {
          user1: { select: { id: true, fullName: true, avatarUrl: true } },
          user2: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      });

      // Update target request -> MATCHED
      await tx.companionRequest.update({
        where: { id: targetRequest.id },
        data: { status: "MATCHED", companionshipId: newCompanionship.id },
      });

      // Cancel currentUser's pending request nếu có
      if (myPendingRequest) {
        await tx.companionRequest.update({
          where: { id: myPendingRequest.id },
          data: { status: "CANCELLED" },
        });
      }

      return [newCompanionship];
    });



    // Gửi in-app notification cho targetRequest user
    await prisma.notification.create({
      data: {
        userId: targetRequest.userId,
        title: "🌿 Đã tìm thấy bạn cây!",
        body: `${companionship.user2.fullName ?? "Ai đó"} muốn kết nối cây cùng bạn`,
        type: "COMPANION_MATCHED",
      },
    });

    return res.status(201).json({
      message: "Ghép nối thành công!",
      data: companionship,
    });
  } catch (err) {
    console.error("[companion] matchRequest error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// ────────────────────────────────────────────────────────────────
// GET /companion/my
// Xem companionship hiện tại của mình
// ────────────────────────────────────────────────────────────────
export async function getMyCompanionship(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const companionship = await prisma.companionship.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: "ACTIVE",
      },
      include: {
        user1: { select: { id: true, fullName: true, avatarUrl: true } },
        user2: { select: { id: true, fullName: true, avatarUrl: true } },
        realPlant: {
          include: {
            flowerType: { select: { id: true, name: true, imageUrl: true } },
            garden: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!companionship) {
      return res.json({ data: null, message: "Bạn chưa có kết nối cây nào" });
    }

    // Unread message count
    const unreadCount = await prisma.companionMessage.count({
      where: {
        companionshipId: companionship.id,
        senderId: { not: userId },
        isRead: false,
      },
    });

    return res.json({ data: { ...companionship, unreadCount } });
  } catch (err) {
    console.error("[companion] getMyCompanionship error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// ────────────────────────────────────────────────────────────────
// GET /companion/my/request
// Xem request PENDING hiện tại của mình
// ────────────────────────────────────────────────────────────────
export async function getMyRequest(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const request = await prisma.companionRequest.findFirst({
      where: { userId, status: "PENDING" },
      include: {
        realPlant: {
          include: {
            flowerType: { select: { id: true, name: true, imageUrl: true } },
            garden: { select: { id: true, name: true } },
          },
        },
      },
    });

    return res.json({ data: request });
  } catch (err) {
    console.error("[companion] getMyRequest error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// ────────────────────────────────────────────────────────────────
// DELETE /companion/my
// Kết thúc companionship hiện tại
// ────────────────────────────────────────────────────────────────
export async function endCompanionship(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { reason } = req.body as { reason?: string };

    const companionship = await prisma.companionship.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: "ACTIVE",
      },
    });

    if (!companionship) {
      return res.status(404).json({ message: "Không tìm thấy kết nối đang hoạt động" });
    }

    await prisma.companionship.update({
      where: { id: companionship.id },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        endReason: reason || "Người dùng kết thúc",
      },
    });

    // Notify both users
    const partnerId = companionship.user1Id === userId ? companionship.user2Id : companionship.user1Id;


    await prisma.notification.create({
      data: {
        userId: partnerId,
        title: "🍂 Kết nối cây đã kết thúc",
        body: "Bạn cây của bạn đã kết thúc hành trình. Bạn có thể tìm người bạn mới!",
        type: "COMPANION_ENDED",
      },
    });

    return res.json({ message: "Đã kết thúc kết nối cây" });
  } catch (err) {
    console.error("[companion] endCompanionship error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// ────────────────────────────────────────────────────────────────
// PATCH /companion/my/share-plant
// Chia sẻ hoặc bỏ chia sẻ cây thật trong companionship
// body: { realPlantId: string | null }
// ────────────────────────────────────────────────────────────────
export async function sharePlant(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { realPlantId } = req.body as { realPlantId: string | null };

    const companionship = await prisma.companionship.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: "ACTIVE",
      },
    });

    if (!companionship) {
      return res.status(404).json({ message: "Không tìm thấy kết nối đang hoạt động" });
    }

    if (realPlantId) {
      // Verify cây này thuộc VirtualPlant của user (user phải đang trồng cây này)
      const plant = await prisma.realPlant.findFirst({
        where: {
          id: realPlantId,
          virtualPlant: { userId },
        },
      });
      if (!plant) {
        return res.status(403).json({ message: "Bạn không có quyền chia sẻ cây này" });
      }
    }

    const updated = await prisma.companionship.update({
      where: { id: companionship.id },
      data: { realPlantId: realPlantId || null },
      include: {
        realPlant: {
          include: { flowerType: { select: { id: true, name: true, imageUrl: true } } },
        },
      },
    });

    return res.json({
      message: realPlantId ? "Đã chia sẻ cây vào kết nối" : "Đã bỏ chia sẻ cây",
      data: updated,
    });
  } catch (err) {
    console.error("[companion] sharePlant error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// ────────────────────────────────────────────────────────────────
// GET /companion/messages
// Lấy tin nhắn của companionship hiện tại (paginated)
// ────────────────────────────────────────────────────────────────
export async function getMessages(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 30);

    const companionship = await prisma.companionship.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: "ACTIVE",
      },
    });

    if (!companionship) {
      return res.status(404).json({ message: "Không tìm thấy kết nối đang hoạt động" });
    }

    const [total, messages] = await Promise.all([
      prisma.companionMessage.count({ where: { companionshipId: companionship.id } }),
      prisma.companionMessage.findMany({
        where: { companionshipId: companionship.id },
        include: {
          sender: { select: { id: true, fullName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      data: messages.reverse(), // chronological order
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[companion] getMessages error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// ────────────────────────────────────────────────────────────────
// POST /companion/messages
// Gửi tin nhắn + emit real-time
// ────────────────────────────────────────────────────────────────
export async function sendMessage(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { content } = req.body as { content: string };

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Nội dung tin nhắn không được trống" });
    }
    if (content.length > 1000) {
      return res.status(400).json({ message: "Tin nhắn tối đa 1000 ký tự" });
    }

    const companionship = await prisma.companionship.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: "ACTIVE",
      },
    });

    if (!companionship) {
      return res.status(404).json({ message: "Không tìm thấy kết nối đang hoạt động" });
    }

    const message = await prisma.companionMessage.create({
      data: {
        companionshipId: companionship.id,
        senderId: userId,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });



    return res.status(201).json({ data: message });
  } catch (err) {
    console.error("[companion] sendMessage error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// ────────────────────────────────────────────────────────────────
// PATCH /companion/messages/read
// Đánh dấu đã đọc tất cả tin nhắn từ đối tác
// ────────────────────────────────────────────────────────────────
export async function markMessagesRead(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    const companionship = await prisma.companionship.findFirst({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: "ACTIVE",
      },
    });

    if (!companionship) {
      return res.status(404).json({ message: "Không tìm thấy kết nối đang hoạt động" });
    }

    await prisma.companionMessage.updateMany({
      where: {
        companionshipId: companionship.id,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });



    return res.json({ message: "Đã đánh dấu đã đọc" });
  } catch (err) {
    console.error("[companion] markMessagesRead error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// ────────────────────────────────────────────────────────────────
// ADMIN ONLY
// ────────────────────────────────────────────────────────────────

// GET /companion/admin/all — Tất cả companionship
export async function adminListCompanionships(req: Request, res: Response) {
  try {
    const { status, mode } = req.query as { status?: string; mode?: string };
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const where = {
      ...(status ? { status: status as "ACTIVE" | "ENDED" } : {}),
      ...(mode ? { mode: mode as CompanionMode } : {}),
    };

    const [total, companionships] = await Promise.all([
      prisma.companionship.count({ where }),
      prisma.companionship.findMany({
        where,
        include: {
          user1: { select: { id: true, fullName: true, avatarUrl: true, email: true } },
          user2: { select: { id: true, fullName: true, avatarUrl: true, email: true } },
          realPlant: {
            include: { flowerType: { select: { name: true, imageUrl: true } } },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      data: companionships,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[companion] adminListCompanionships error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// GET /companion/admin/stats — Thống kê
export async function adminGetStats(req: Request, res: Response) {
  try {
    const [totalActive, totalEnded, totalPending, modeBreakdown] = await Promise.all([
      prisma.companionship.count({ where: { status: "ACTIVE" } }),
      prisma.companionship.count({ where: { status: "ENDED" } }),
      prisma.companionRequest.count({ where: { status: "PENDING" } }),
      prisma.companionship.groupBy({
        by: ["mode"],
        _count: { mode: true },
      }),
    ]);

    return res.json({
      data: {
        totalActive,
        totalEnded,
        totalPending,
        total: totalActive + totalEnded,
        modeBreakdown: modeBreakdown.map((m) => ({ mode: m.mode, count: m._count.mode })),
      },
    });
  } catch (err) {
    console.error("[companion] adminGetStats error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// GET /companion/admin/requests — Tất cả pending requests
export async function adminListRequests(req: Request, res: Response) {
  try {
    const { status, mode } = req.query as { status?: string; mode?: string };
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const where = {
      ...(status ? { status: status as "PENDING" | "MATCHED" | "CANCELLED" } : {}),
      ...(mode ? { mode: mode as CompanionMode } : {}),
    };

    const [total, requests] = await Promise.all([
      prisma.companionRequest.count({ where }),
      prisma.companionRequest.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      data: requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[companion] adminListRequests error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}

// DELETE /companion/admin/:id — Force-end companionship
export async function adminEndCompanionship(req: Request, res: Response) {
  try {
    const { id } = req.params as { id: string };

    const companionship = await prisma.companionship.findUnique({ where: { id: id as string } });
    if (!companionship) {
      return res.status(404).json({ message: "Không tìm thấy" });
    }
    if (companionship.status === "ENDED") {
      return res.status(400).json({ message: "Kết nối này đã kết thúc rồi" });
    }

    await prisma.companionship.update({
      where: { id },
      data: { status: "ENDED", endedAt: new Date(), endReason: "Admin kết thúc" },
    });

    // Notify both users


    return res.json({ message: "Đã kết thúc kết nối" });
  } catch (err) {
    console.error("[companion] adminEndCompanionship error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
}
