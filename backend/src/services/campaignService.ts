import { prisma } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { emailService } from '../integrations/emailService';
import { smsService } from '../integrations/smsService';
import { replaceTokens, addHours, addDays } from '../utils/helpers';
import { logger } from '../utils/logger';
import {
  CampaignType,
  CampaignStatus,
  ScheduleType,
  MessageStatus,
  MessageType,
} from '@prisma/client';

interface CreateCampaignInput {
  clientId: string;
  name: string;
  description?: string;
  type: CampaignType;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  emailSubject?: string;
  emailTemplate?: string;
  smsTemplate?: string;
  scheduleType: ScheduleType;
  scheduledAt?: Date;
  delayHours?: number;
  dripEnabled?: boolean;
  dripIntervalDays?: number;
  dripMaxMessages?: number;
}

interface AddRecipientsInput {
  campaignId: string;
  customerIds: string[];
}

export class CampaignService {
  async create(input: CreateCampaignInput) {
    if (input.emailEnabled && !input.emailTemplate) {
      throw new ValidationError({ emailTemplate: ['Email template is required when email is enabled'] });
    }

    if (input.smsEnabled && !input.smsTemplate) {
      throw new ValidationError({ smsTemplate: ['SMS template is required when SMS is enabled'] });
    }

    return prisma.campaign.create({
      data: {
        clientId: input.clientId,
        name: input.name,
        description: input.description,
        type: input.type,
        emailEnabled: input.emailEnabled ?? true,
        smsEnabled: input.smsEnabled ?? false,
        emailSubject: input.emailSubject,
        emailTemplate: input.emailTemplate,
        smsTemplate: input.smsTemplate,
        scheduleType: input.scheduleType,
        scheduledAt: input.scheduledAt,
        delayHours: input.delayHours,
        dripEnabled: input.dripEnabled ?? false,
        dripIntervalDays: input.dripIntervalDays,
        dripMaxMessages: input.dripMaxMessages,
        status: CampaignStatus.DRAFT,
      },
    });
  }

  async update(id: string, clientId: string, input: Partial<CreateCampaignInput>) {
    const campaign = await prisma.campaign.findFirst({
      where: { id, clientId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ValidationError({ status: ['Cannot update a campaign that is not in draft status'] });
    }

    return prisma.campaign.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string, clientId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id, clientId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    await prisma.campaign.delete({ where: { id } });
  }

  async getById(id: string, clientId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id, clientId },
      include: {
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    return campaign;
  }

  async list(clientId: string, status?: CampaignStatus, page = 1, limit = 20) {
    const where: any = { clientId };
    if (status) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { recipients: true },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async addRecipients(input: AddRecipientsInput) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: input.campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ValidationError({ status: ['Cannot add recipients to a non-draft campaign'] });
    }

    // Add recipients, skipping duplicates
    const created = await prisma.campaignRecipient.createMany({
      data: input.customerIds.map((customerId) => ({
        campaignId: input.campaignId,
        customerId,
      })),
      skipDuplicates: true,
    });

    // Update total recipients count
    const count = await prisma.campaignRecipient.count({
      where: { campaignId: input.campaignId },
    });

    await prisma.campaign.update({
      where: { id: input.campaignId },
      data: { totalRecipients: count },
    });

    return { added: created.count, total: count };
  }

  async removeRecipients(campaignId: string, customerIds: string[]) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ValidationError({ status: ['Cannot remove recipients from a non-draft campaign'] });
    }

    await prisma.campaignRecipient.deleteMany({
      where: {
        campaignId,
        customerId: { in: customerIds },
      },
    });

    const count = await prisma.campaignRecipient.count({
      where: { campaignId },
    });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { totalRecipients: count },
    });

    return { total: count };
  }

  async launch(id: string, clientId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id, clientId },
      include: {
        client: {
          include: {
            businessProfiles: {
              where: { isActive: true },
              include: { reviewLinks: { where: { isActive: true } } },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new ValidationError({ status: ['Campaign must be in draft status to launch'] });
    }

    if (campaign.totalRecipients === 0) {
      throw new ValidationError({ recipients: ['Campaign must have at least one recipient'] });
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id },
      data: {
        status: campaign.scheduleType === ScheduleType.SCHEDULED
          ? CampaignStatus.SCHEDULED
          : CampaignStatus.ACTIVE,
        startedAt: campaign.scheduleType === ScheduleType.IMMEDIATE ? new Date() : undefined,
      },
    });

    // If immediate, start processing
    if (campaign.scheduleType === ScheduleType.IMMEDIATE) {
      this.processCampaign(id).catch((err) => logger.error('Campaign processing error:', err));
    }

    return { status: 'launched' };
  }

  async pause(id: string, clientId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id, clientId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new ValidationError({ status: ['Only active campaigns can be paused'] });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });

    return { status: 'paused' };
  }

  async resume(id: string, clientId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id, clientId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new ValidationError({ status: ['Only paused campaigns can be resumed'] });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ACTIVE },
    });

    // Resume processing
    this.processCampaign(id).catch((err) => logger.error('Campaign processing error:', err));

    return { status: 'resumed' };
  }

  async processCampaign(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        client: {
          include: {
            businessProfiles: {
              where: { isActive: true },
              include: { reviewLinks: { where: { isActive: true }, take: 1 } },
            },
          },
        },
        recipients: {
          where: {
            OR: [
              { emailStatus: MessageStatus.PENDING },
              { smsStatus: MessageStatus.PENDING },
            ],
          },
          include: { customer: true },
          take: 100, // Process in batches
        },
      },
    });

    if (!campaign || campaign.status !== CampaignStatus.ACTIVE) {
      return;
    }

    const businessProfile = campaign.client.businessProfiles[0];
    const reviewLink = businessProfile?.reviewLinks[0]?.fullUrl || '';
    const businessName = businessProfile?.name || campaign.client.name;

    for (const recipient of campaign.recipients) {
      const customer = recipient.customer;

      // Check opt-outs
      const canEmail = campaign.emailEnabled && customer.email && !customer.optOutEmail;
      const canSms = campaign.smsEnabled && customer.phone && !customer.optOutSms;

      const tokens = {
        firstName: customer.firstName,
        lastName: customer.lastName || '',
        customerName: `${customer.firstName} ${customer.lastName || ''}`.trim(),
        businessName,
        reviewLink,
      };

      // Send email
      if (canEmail && recipient.emailStatus === MessageStatus.PENDING) {
        const subject = replaceTokens(campaign.emailSubject || '', tokens);
        const body = replaceTokens(campaign.emailTemplate || '', tokens);

        const result = await emailService.send({
          to: customer.email!,
          subject,
          html: body,
        });

        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            emailStatus: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
            emailSentAt: result.success ? new Date() : undefined,
          },
        });

        // Log message
        await prisma.campaignMessage.create({
          data: {
            campaignId,
            recipientId: recipient.id,
            type: MessageType.EMAIL,
            toAddress: customer.email!,
            subject,
            body,
            status: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
            externalId: result.messageId,
            sentAt: result.success ? new Date() : undefined,
            errorMessage: result.error,
          },
        });

        if (result.success) {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { sentCount: { increment: 1 } },
          });
        }
      }

      // Send SMS
      if (canSms && recipient.smsStatus === MessageStatus.PENDING) {
        const message = replaceTokens(campaign.smsTemplate || '', tokens);

        const result = await smsService.send({
          to: customer.phone!,
          message,
        });

        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            smsStatus: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
            smsSentAt: result.success ? new Date() : undefined,
          },
        });

        // Log message
        await prisma.campaignMessage.create({
          data: {
            campaignId,
            recipientId: recipient.id,
            type: MessageType.SMS,
            toAddress: customer.phone!,
            body: message,
            status: result.success ? MessageStatus.SENT : MessageStatus.FAILED,
            externalId: result.messageId,
            sentAt: result.success ? new Date() : undefined,
            errorMessage: result.error,
          },
        });

        if (result.success) {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { sentCount: { increment: 1 } },
          });
        }
      }

      // Handle drip campaigns
      if (campaign.dripEnabled && campaign.dripIntervalDays) {
        const maxSteps = campaign.dripMaxMessages || 3;
        if (recipient.dripStep < maxSteps) {
          const nextDripAt = addDays(new Date(), campaign.dripIntervalDays);
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              dripStep: recipient.dripStep + 1,
              nextDripAt,
              emailStatus: canEmail ? MessageStatus.PENDING : recipient.emailStatus,
              smsStatus: canSms ? MessageStatus.PENDING : recipient.smsStatus,
            },
          });
        }
      }
    }

    // Check if campaign is complete
    const pendingCount = await prisma.campaignRecipient.count({
      where: {
        campaignId,
        OR: [
          { emailStatus: MessageStatus.PENDING },
          { smsStatus: MessageStatus.PENDING },
        ],
      },
    });

    if (pendingCount === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }
  }

  async getStats(campaignId: string, clientId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, clientId },
    });

    if (!campaign) {
      throw new NotFoundError('Campaign');
    }

    const [emailStats, smsStats] = await Promise.all([
      prisma.campaignMessage.groupBy({
        by: ['status'],
        where: { campaignId, type: MessageType.EMAIL },
        _count: true,
      }),
      prisma.campaignMessage.groupBy({
        by: ['status'],
        where: { campaignId, type: MessageType.SMS },
        _count: true,
      }),
    ]);

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalRecipients: campaign.totalRecipients,
        sentCount: campaign.sentCount,
        deliveredCount: campaign.deliveredCount,
        openedCount: campaign.openedCount,
        clickedCount: campaign.clickedCount,
        reviewCount: campaign.reviewCount,
      },
      email: this.formatMessageStats(emailStats),
      sms: this.formatMessageStats(smsStats),
    };
  }

  private formatMessageStats(stats: Array<{ status: MessageStatus; _count: number }>) {
    const result: Record<string, number> = {
      pending: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      failed: 0,
      bounced: 0,
    };

    for (const stat of stats) {
      result[stat.status.toLowerCase()] = stat._count;
    }

    return result;
  }
}

export const campaignService = new CampaignService();
